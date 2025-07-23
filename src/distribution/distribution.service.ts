import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDistributionDto } from "./distribution.dto";
import { CacheNamespace, Distribution } from "@prisma/client";
import { RedisService } from "src/redis/redis.service";
import { CampaignService } from "src/campaign/campaign.service";
import { ProductService } from "src/product/product.service";
import { CampaignParamService } from "src/campaign-param/param.service";

@Injectable()
export class DistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly campaign: CampaignService,
    private readonly productService: ProductService,
    private readonly paramService: CampaignParamService,
  ) {}

  private cacheKey(resourceId: string, resource = "id"): string {
    return `${CacheNamespace.distribution}:${resource}:${resourceId}`;
  }

  async create({ campaignId, productId, ...dto }: CreateDistributionDto) {
    const distribution = await this.prisma.distribution.create({
      data: {
        ...dto,
        campaign: {
          connect: { id: campaignId },
        },
        product: {
          connect: { id: productId },
        },
      },
      include: {
        product: true,
      },
    });

    await this.cache(distribution.id, distribution);
    return distribution;
  }

  private async cache(id: string, distribution: Distribution) {
    const key = this.cacheKey(id);
    await this.redis.set(key, distribution, 3600); // Cache for 1 hour
  }

  async getById(id: string) {
    const key = this.cacheKey(id);
    const cached = await this.redis.get<Distribution>(key);
    if (cached) return cached;

    const distribution = await this.prisma.distribution.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution with ID ${id} not found`);
    }

    await this.cache(id, distribution);
    return distribution;
  }

  async fromCampaign(externalCampaignId: string, externalProductId: string) {
    const campaign =
      await this.campaign.findByExternalCampaignId(externalCampaignId);

    if (!campaign) {
      throw new NotFoundException(
        `Campaign with external ID ${externalCampaignId} not found`,
      );
    }

    // find the product (will create it if it doesn't exist)
    const product = await this.productService.findOrCreate(
      externalProductId,
      campaign.id,
    );

    if (!product) {
      throw new NotFoundException(
        `Product with external ID ${externalProductId} not found`,
      );
    }

    // see if a distribution already exists
    const existingDistribution = await this.prisma.distribution.findFirst({
      where: {
        productId: product.id,
        campaignId: campaign.id,
      },
      include: { product: true },
    });

    if (existingDistribution) {
      // cache the existing distribution
      await this.cache(existingDistribution.id, existingDistribution);
      return existingDistribution;
    }

    // create a new distribution
    const distribution = await this.prisma.distribution.create({
      data: {
        product: {
          connect: { id: product.id },
        },
        campaign: {
          connect: { id: campaign.id },
        },
        status: "active",
        priority: 10, // default priority
        metadata: {
          //   domain: campaign.metadata?.domain || "unknown-site.com",
          //   page: campaign.metadata?.placements?.[0] || "all",
          //   fallback: product.metadata?.isFallback || false,
        },
      },
      include: { product: true },
    });

    // cache the distribution
    await this.cache(distribution.id, distribution);
    return distribution;
  }

  async fromCampaignParam(externalCampaignId: string, externalParamId: string) {
    const campaign =
      await this.campaign.findByExternalCampaignId(externalCampaignId);
    if (!campaign) {
      throw new NotFoundException(
        `Campaign with external ID ${externalCampaignId} not found`,
      );
    }

    // find the param (will create it if it doesn't exist)
    const param = await this.paramService.insert(
      externalParamId,
      externalCampaignId,
      {
        type: "placement",
      },
    );

    if (!param) {
      throw new NotFoundException(
        `Param with external ID ${externalParamId} not found`,
      );
    }

    // see if a distribution already exists
    const existingDistributions = await this.prisma.distribution.findMany({
      where: {
        campaignId: campaign.id,
        paramId: param.id,
      },
    });

    if (existingDistributions.length > 0) {
      // cache the existing distributions
      await Promise.all(
        existingDistributions.map((dist) => this.cache(dist.id, dist)),
      );
      return existingDistributions;
    }

    const distribution = await this.prisma.distribution.create({
      data: {
        campaign: {
          connect: { id: campaign.id },
        },
        param: {
          connect: { id: param.id },
        },
        status: "active",
        priority: 10, // default priority
        metadata: {
          //   domain: campaign.metadata?.domain || "unknown-site.com",
          //   page: campaign.metadata?.placements?.[0] || "all",
          //   fallback: param.metadata?.isFallback || false,
        },
      },
    });

    return distribution;
  }
  async updateDistribution(id: string, data: Partial<CreateDistributionDto>) {
    return this.prisma.distribution.update({
      where: { id },
      data,
    });
  }

  async deleteDistribution(id: string) {
    return this.prisma.distribution.delete({
      where: { id },
    });
  }

  async getDistributionsByCampaign(campaignId: string) {
    return this.prisma.distribution.findMany({
      where: { campaignId },
      orderBy: { priority: "desc" },
    });
  }

  //   async matchDistribution(domain: string, page: string, campaignId: string) {
  //     return this.prisma.distribution.findFirst({
  //       where: {
  //         campaignId,
  //         AND: [
  //           { campaignId },
  //           { metadata: { path: ["domain"], equals: domain } },
  //           {
  //             OR: [
  //               { metadata: { path: ["page"], equals: page } },
  //               { metadata: { path: ["page"], equals: "all" } },
  //             ],
  //           },
  //         ],
  //       },
  //       orderBy: { priority: "desc" },
  //     });
  //   }
}

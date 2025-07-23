import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.dto";
import {
  CacheNamespace,
  Campaign,
  Distribution,
  Prisma,
  Product,
} from "@prisma/client";

// import { CampaignWithRules } from "src/redirect/redirect.service";
// import { CreateProductDto } from "src/product/product.dto";

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private cacheKey(resourceId: string, resource = "slug"): string {
    return `${CacheNamespace.campaign}:${resource}:${resourceId}`;
  }

  async findAll(
    where: Prisma.CampaignWhereInput,
    include?: Prisma.CampaignInclude,
  ): Promise<
    (Campaign & { distributions?: (Distribution & { product?: Product })[] })[]
  > {
    const campaigns = await this.prisma.campaign.findMany({
      where,
      include,
    });
    if (!campaigns || campaigns.length === 0) {
      this.logger.warn("No campaigns found");
      return [];
    }
    return campaigns;
  }

  async findActive(): Promise<Campaign[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: "active",
      },
    });

    if (!campaigns || campaigns.length === 0) {
      this.logger.warn("No active campaigns found");
      return [];
    }

    return campaigns;
  }

  async findOne(id: string) {
    const namespace = CacheNamespace.campaign;
    const key = this.cacheKey(namespace, id);
    const cached = await this.redis.get(key);
    if (cached) return cached;
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    await this.redis.set(key, campaign, 3600); // 1 hour cache
    return campaign;
  }

  async findByExternalCampaignId(externalCampaignId: string) {
    const namespace = CacheNamespace.campaign;
    const key = this.cacheKey(namespace, externalCampaignId);
    const cached = await this.redis.get<Campaign>(key);
    if (cached) return cached;
    const campaign = await this.prisma.campaign.findFirst({
      where: { externalCampaignId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    await this.redis.set(key, campaign, 3600); // 1 hour cache
    this.logger.log(`Cached campaign with external ID: ${externalCampaignId}`);
    return campaign;
  }

  async findBySlug(
    slug: string,
    include = {},
  ): Promise<Campaign & { distributions?: Distribution[] }> {
    const namespace = CacheNamespace.campaign;
    const key = this.cacheKey(namespace, slug); // Use slug for cache key
    const cached = await this.redis.get<Campaign>(key);
    if (cached) return cached;
    const campaign = await this.prisma.campaign.findFirst({
      where: { slug },
      ...include,
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    await this.redis.set(key, campaign, 3600); // 1 hour cache
    return campaign;
  }

  async create(dto: CreateCampaignDto) {
    if (!dto) throw new Error("Data is required to create a campaign");

    // check if campaign with the same slug already exists
    const existingCampaign = await this.prisma.campaign.findFirst({
      where: { url: dto.url },
    });
    if (existingCampaign) {
      this.logger.warn(`Campaign with slug ${dto.slug} already exists`);
      return existingCampaign;
    }

    // Step 1: Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        ...dto,
      },
    });

    if (!campaign) {
      throw new Error("Failed to create campaign");
    }

    // Step 2: Cache the campaign
    await this.cache(campaign);
    this.logger.log(`Created campaign with slug: ${campaign.slug}`);
    return campaign;
  }

  async publish(externalCampaignId: string) {
    return [];
  }

  private async cache(campaign: Campaign, ttlSeconds = 3600) {
    const key = this.cacheKey(campaign.slug);
    this.logger.log(`Caching campaign with key: ${key}`);
    await this.redis.set(key, campaign, ttlSeconds);
  }

  async invalidateCache(namespace: CacheNamespace, slug: string) {
    const key = this.cacheKey(namespace, slug);
    this.logger.log(`Invalidating cache for key: ${key}`);
    await this.redis.del(key);
  }

  async update(id: string, dto: UpdateCampaignDto) {
    if (!id || !dto)
      throw new Error("ID and data are required to update a campaign");
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
      },
    });
    await this.cache(campaign);
    this.logger.log(`Updated campaign with ID: ${id}`);
    return campaign;
  }
}

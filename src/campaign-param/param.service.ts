import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { CampaignService } from "src/campaign/campaign.service";
import { ProductService } from "src/product/product.service";
import { CampaignParamType } from "@prisma/client";
import { KemetParam } from "./param.dto";

@Injectable()
export class CampaignParamService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly campaign: CampaignService,
    private readonly productService: ProductService,
  ) {}

  private cacheKey(resourceId: string, resource = "id"): string {
    return `campaign:${resource}:${resourceId}`;
  }

  private async getKemetParam(
    externalParamId: string,
  ): Promise<KemetParam | null> {
    const key = this.cacheKey(externalParamId, "param");
    const cached = await this.redis.get<KemetParam>(key);
    if (cached) {
      this.logger.log(
        `Cache hit for Kemet param with external ID: ${externalParamId}`,
      );
      return cached;
    }

    const response = await fetch(
      `${process.env.KEMET_API_URL}/param/${externalParamId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.KEMET_API_SECRET}`,
        },
      },
    );
    if (!response.ok) {
      this.logger.error(response.statusText);
      this.logger.error(
        `Failed to fetch Kemet param with external ID: ${externalParamId}`,
      );
      return null;
    }
    const { param } = await response.json();
    if (!param.id) {
      this.logger.error(
        `Kemet param with external ID ${externalParamId} does not have an ID`,
      );
      return null;
    }
    this.redis.set<KemetParam>(key, param, 3600); // Cache for 1 hour
    this.logger.log(`Cached Kemet param with external ID: ${externalParamId}`);
    return param as KemetParam;
  }

  async insert(
    paramId,
    campaignId,
    data: {
      type: CampaignParamType;
      metadata?: string;
      placementId?: string;
    },
  ) {
    const kemetParam = (await this.getKemetParam(paramId)) as KemetParam & {
      campaignId: string;
    };

    if (!kemetParam) {
      this.logger.error(`Kemet param with external ID ${paramId} not found`);
      return null;
    }

    return await this.prisma.campaignParam.upsert({
      where: {
        unique_campaign_param: {
          type: kemetParam.type as CampaignParamType,
          externalParamId: kemetParam.id as string,
        },
      },
      create: {
        externalParamId: kemetParam.id as string,
        externalCampaignId: kemetParam.campaignId as string,
        type: kemetParam.type as CampaignParamType,
        placementId: kemetParam.placementId as string,
        siloId: kemetParam.siloId as string,
        metadata: kemetParam.metadata as string,
      },
      update: {
        metadata: kemetParam.metadata,
        siloId: kemetParam.siloId,
      },
    });
  }
}

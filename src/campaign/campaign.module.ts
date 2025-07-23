import { Module } from "@nestjs/common";
import { CampaignService } from "./campaign.service";
import { CampaignController } from "./campaign.controller";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { ProductService } from "src/product/product.service";
import { DistributionService } from "src/distribution/distribution.service";
import { CampaignParamService } from "src/campaign-param/param.service";

@Module({
  controllers: [CampaignController],
  providers: [
    CampaignService,
    PrismaService,
    RedisService,
    ProductService,
    DistributionService,
    CampaignParamService,
  ],
  exports: [CampaignService],
})
export class CampaignModule {}

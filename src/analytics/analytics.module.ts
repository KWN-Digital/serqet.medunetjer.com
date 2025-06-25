import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "src/prisma/prisma.service";
// import { AnalyticsController } from "./analytics.controller";
import { CampaignService } from "src/campaign/campaign.service";
import { RedisService } from "src/redis/redis.service";
import { ProductService } from "src/product/product.service";

@Module({
  // controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    PrismaService,
    CampaignService,
    RedisService,
    ProductService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

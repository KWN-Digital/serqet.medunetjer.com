import { Module } from "@nestjs/common";
import { CampaignModule } from "../campaign/campaign.module";
import { CampaignService } from "src/campaign/campaign.service";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { ProductService } from "src/product/product.service";
import { ImpressionController } from "./impression.controller";
import { ImpressionService } from "./impression.service";
import { SessionService } from "src/session/session.service";
// import { AnalyticsService } from "src/analytics/analytics.service";

@Module({
  imports: [CampaignModule],
  providers: [
    CampaignService,
    PrismaService,
    RedisService,
    ProductService,
    ImpressionService,
    SessionService,
    // AnalyticsService,
  ],
  controllers: [ImpressionController],
})
export class ImpressionModule {}

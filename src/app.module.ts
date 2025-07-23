import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma/prisma.service";
import { ScheduleModule } from "@nestjs/schedule";

// Controllers
import { AppController } from "./app.controller";

// Modules
import { CampaignModule } from "./campaign/campaign.module";
import { RedisService } from "./redis/redis.service";
import { AppService } from "./app.service";
import { DistributionService } from "./distribution/distribution.service";
import { DistributionModule } from "./distribution/distribution.module";
import { ProductService } from "./product/product.service";
import { CampaignService } from "./campaign/campaign.service";
import { RedirectModule } from "./redirect/redirect.module";
import { ImpressionModule } from "./impression/impression.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AnalyticsService } from "./analytics/analytics.service";
import { CampaignParamService } from "./campaign-param/param.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ImpressionModule,
    CampaignModule,
    RedirectModule,
    AnalyticsModule,
    DistributionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    RedisService,
    DistributionService,
    ProductService,
    CampaignService,
    AnalyticsService,
    CampaignParamService,
  ],
})
export class AppModule {}

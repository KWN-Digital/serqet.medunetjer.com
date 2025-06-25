import { Module } from "@nestjs/common";
import { RedirectService } from "./redirect.service";
import { RedirectController } from "./redirect.controller";
import { CampaignModule } from "../campaign/campaign.module";
import { CampaignService } from "src/campaign/campaign.service";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { ProductService } from "src/product/product.service";
// import { RuleEvaluatorService } from "src/rules/rule-evaluator.service";
// import { ClickService } from "src/click/click.service";
import { SessionService } from "src/session/session.service";
import { ClickService } from "src/click/click.service";
import { ImpressionService } from "src/impression/impression.service";
// import { AnalyticsService } from "src/analytics/analytics.service";

@Module({
  imports: [CampaignModule],
  providers: [
    RedirectService,
    CampaignService,
    PrismaService,
    RedisService,
    ProductService,
    SessionService,
    ClickService,
    ImpressionService,
  ],
  controllers: [RedirectController],
})
export class RedirectModule {}

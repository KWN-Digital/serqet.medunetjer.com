import { Module } from "@nestjs/common";
import { DistributionService } from "./distribution.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisModule } from "src/redis/redis.module";
import { CampaignService } from "src/campaign/campaign.service";
import { ProductService } from "src/product/product.service";
import { CampaignParamService } from "src/campaign-param/param.service";

@Module({
  imports: [RedisModule], // if you're using Redis
  providers: [
    DistributionService,
    PrismaService,
    CampaignService,
    ProductService,
    CampaignParamService,
  ],
  exports: [DistributionService], // allow other modules to use it
})
export class DistributionModule {}

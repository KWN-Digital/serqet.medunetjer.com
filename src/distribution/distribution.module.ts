// create the distribution module
import { Module } from "@nestjs/common";
import { DistributionService } from "./distribution.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisModule } from "src/redis/redis.module";
import { CampaignService } from "src/campaign/campaign.service";
import { ProductService } from "src/product/product.service";

@Module({
  imports: [RedisModule], // if you're using Redis
  providers: [
    DistributionService,
    PrismaService,
    CampaignService,
    ProductService,
  ],
  exports: [DistributionService], // allow other modules to use it
})
export class DistributionModule {}

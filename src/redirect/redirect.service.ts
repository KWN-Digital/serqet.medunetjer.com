import { CampaignService } from "src/campaign/campaign.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { SessionService } from "src/session/session.service";
import { ProductService } from "src/product/product.service";
import { Distribution } from "@prisma/client";
import { ClickService } from "src/click/click.service";
import { ImpressionService } from "src/impression/impression.service";
import { SessionDto } from "src/session/session.dto";

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisService,
    private readonly session: SessionService,
    private readonly campaign: CampaignService,
    private readonly product: ProductService,
    private readonly click: ClickService,
    private readonly impression: ImpressionService,
  ) {}

  async getCampaignDistributions(campignSlug: string) {
    try {
      const campaign = await this.campaign.findBySlug(campignSlug);
      if (!campaign || campaign.status !== "active") {
        throw new NotFoundException("Campaign not found or inactive");
      }

      const matches = await this.prisma.distribution.findMany({
        where: {
          campaignId: campaign.id,
          status: "active",
        },
        take: 10,
        orderBy: {
          priority: "desc",
        },
      });

      if (!matches || matches.length === 0) {
        throw new NotFoundException(
          "No active distributions found for this campaign",
        );
      }

      return matches;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw to maintain the original error context
      }
      return [];
    }
  }

  private weightDistributions(distributions: Distribution[]): Distribution {
    const totalWeight = distributions.reduce((sum, d) => sum + d.priority, 0);
    const rand = Math.random() * totalWeight;

    let cumulative = 0;
    for (const dist of distributions) {
      cumulative += dist.priority;
      if (rand < cumulative) {
        return dist;
      }
    }

    // fallback in case of rounding issues
    return distributions[distributions.length - 1];
  }

  async redirect(campaignSlug: string, dto: SessionDto) {
    const distributions = await this.getCampaignDistributions(campaignSlug);
    const { productId, id, campaignId } =
      await this.weightDistributions(distributions);

    const product = await this.product.findById(productId);
    if (!product) {
      throw new NotFoundException("Product not found for the distribution");
    }
    const url = product[product.type];
    if (!url) {
      throw new NotFoundException("No URL found for the product type");
    }
    campaignId && this.click.track(id, campaignId, dto);
    campaignId && this.impression.fill(id, { campaignId }, dto);
    campaignId &&
      product.id &&
      this.impression.fill(id, { productId: product.id, campaignId }, dto);

    return url;
  }
}

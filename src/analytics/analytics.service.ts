import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignService } from "src/campaign/campaign.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import moment from "moment";
import { Analytics, Campaign, Product } from "@prisma/client";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaign: CampaignService,
  ) {}

  findMany(where: {
    scope?: "campaign" | "distribution";
    campaignId?: string;
    distributionId?: string;
    bucket?: string;
  }) {
    return this.prisma.analytics.findMany({
      where: {
        ...where,
        scope: where.scope || "campaign",
      },
    });
  }

  private async aggregateCampaignProductAnalytics(
    productId: string,
    bucket: string,
    campaignId: string,
  ) {
    const startOfDay = moment(bucket).startOf("day").toDate();
    const endOfDay = moment(bucket).endOf("day").toDate();
    const distributions = await this.prisma.distribution.findMany({
      where: {
        productId,
        campaignId,
      },
      select: { id: true },
    });
    if (!distributions || distributions.length === 0) {
      this.logger.warn(
        `No distributions found for product ${productId} in the specified date range.`,
      );
      return null;
    }

    const distributionIds = distributions.map((d) => d.id);

    const [impressions, clicks, conversions, uniqueClicks] = await Promise.all([
      this.prisma.impression.count({
        where: {
          // distributionId: { in: distributionIds },
          productId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.click.count({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.conversion.count({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.click.groupBy({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        by: ["sessionId"],
      }),
    ]);

    const ctr = impressions > 0 ? clicks / impressions : 0;

    return await this.prisma.analytics.upsert({
      where: {
        scope_productId_bucket: {
          scope: "product",
          productId,
          bucket,
        },
      },
      update: {
        impressions,
        clicks,
        conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
      },
      create: {
        scope: "product",
        productId,
        impressions,
        clicks,
        campaignId,
        conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
        bucket,
      },
    });
  }

  private async aggregateCampaignAnalytics(campaignId: string, bucket: string) {
    const startOfDay = moment(bucket).startOf("day").toDate();
    const endOfDay = moment(bucket).endOf("day").toDate();

    const distributions = await this.prisma.distribution.findMany({
      where: {
        campaign: { status: "active", id: campaignId },
      },
      select: { id: true },
    });

    const distributionIds = distributions.map((d) => d.id);

    const [impressions, clicks, conversions, uniqueClicks] = await Promise.all([
      this.prisma.impression.count({
        where: {
          // this is different because i'm getting the total number of impressions for the campaign for the day, not just ones claimed by distributions
          campaignId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.click.count({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.conversion.count({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.click.groupBy({
        where: {
          distributionId: { in: distributionIds },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        by: ["sessionId"],
      }),
    ]);

    const ctr = impressions > 0 ? clicks / impressions : 0;

    return await this.prisma.analytics.upsert({
      where: {
        scope_campaignId_bucket: {
          scope: "campaign",
          campaignId,
          bucket,
        },
      },
      update: {
        impressions,
        clicks,
        conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
      },
      create: {
        scope: "campaign",
        campaignId,
        impressions,
        clicks,
        conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
        bucket,
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateAnalytics() {
    this.logger.log(
      `Starting analytics aggregation for ${moment().format("YYYY-MM-DD")}...`,
    );

    const campaigns = await this.campaign.findAll(
      {
        status: "active",
      },
      {
        distributions: {
          include: {
            product: true,
          },
        },
      },
    );

    if (!campaigns || campaigns.length === 0) {
      this.logger.warn("No active campaigns found for analytics aggregation.");
      return;
    }

    this.logger.log(
      `Found ${campaigns.length} active campaigns, aggregating analytics...`,
    );

    const bucket = moment().startOf("day").format("YYYY-MM-DD"); // Daily bucket

    // Aggregate analytics for each campaign
    for (const campaign of campaigns) {
      try {
        const campaignSummary = await this.aggregateCampaignAnalytics(
          campaign.id,
          bucket,
        );
        await this.sendCampaignToKemet(campaign, campaignSummary);

        const distributions = campaign.distributions || [];
        for (const distribution of distributions) {
          if (!distribution.product) {
            this.logger.warn(
              `No product found for distribution ${distribution.id} in campaign ${campaign.id}. Skipping product analytics.`,
            );
            continue;
          }
          const summary = await this.aggregateCampaignProductAnalytics(
            distribution.product?.id,
            bucket,
            campaign.id,
          );
          if (!summary) {
            this.logger.warn(
              `No analytics found for product ${distribution.product.id} in campaign ${campaign.id}. Skipping.`,
            );
            continue;
          }
          this.logger.log(
            `Aggregated analytics for product ${distribution.product.id} in campaign ${campaign.id}.`,
          );
          await this.sendCampaignProductToKemet(
            distribution.product,
            campaign,
            summary,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not send campaign analytics to Kemet for campaign ${campaign.externalCampaignId}: ${error.message}`,
        );
      } finally {
        this.logger.log(
          `Analytics for campaign ${campaign.id} have been synced with Kemet Insights.`,
        );
      }
    }

    this.logger.log("Analytics aggregation completed.");
  }

  async sendCampaignToKemet(campaign: Campaign, summary?: Analytics) {
    const response = await fetch(
      `${process.env.KEMET_API_URL}/analytics/campaign/${campaign.externalCampaignId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.KEMET_API_SECRET}`,
        },
        body: JSON.stringify(summary),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send campaign ${campaign.id} to Kemet: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async sendCampaignProductToKemet(
    product: Product,
    campaign: Campaign,
    summary?: Analytics,
  ) {
    const response = await fetch(
      `${process.env.KEMET_API_URL}/analytics/campaign/${campaign.externalCampaignId}/product/${product.externalProductId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.KEMET_API_SECRET}`,
        },
        body: JSON.stringify({
          ...summary,
          externalCampaignId: campaign.externalCampaignId,
          externalProductId: product.externalProductId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send campaign ${campaign.id} to Kemet: ${response.statusText}`,
      );
    }

    return await response.json();
  }
}

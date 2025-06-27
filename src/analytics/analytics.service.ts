import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignService } from "src/campaign/campaign.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import moment from "moment";

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

  private async aggregateCampaignAnalytics(campaignId: string, bucket: string) {
    const distributions = await this.prisma.distribution.findMany({
      where: { campaignId },
      select: { id: true },
    });

    const distributionIds = distributions.map((d) => d.id);
    const startOfDay = moment(bucket).startOf("day").toDate();
    const endOfDay = moment(bucket).endOf("day").toDate();

    const [
      impressions,
      clicks,
      // conversions,
      uniqueClicks,
    ] = await Promise.all([
      this.prisma.impression.count({
        where: {
          campaignId: { equals: campaignId },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      this.prisma.click.count({
        where: {
          distributionId: { in: distributionIds },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      // this.prisma.conversion.count({
      //   where: { distributionId: { in: distributionIds } },
      // }),
      this.prisma.click.groupBy({
        where: {
          distributionId: { in: distributionIds },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
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
        // conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
      },
      create: {
        scope: "campaign",
        campaignId,
        impressions,
        clicks,
        // conversions,
        uniqueClicks: uniqueClicks.length,
        ctr,
        bucket,
      },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async aggregateAnalytics() {
    this.logger.log("Aggregating analytics...");

    const campaigns = await this.campaign.findAll();

    for (const campaign of campaigns) {
      const bucket = new Date().toISOString().split("T")[0]; // Daily bucket
      const summary = await this.aggregateCampaignAnalytics(
        campaign.id,
        bucket,
      );
      try {
        const response = await fetch(
          `${process.env.KEMET_API_URL}/analytics/${campaign.externalCampaignId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...summary,
              externalCampaignId: campaign.externalCampaignId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to send analytics for campaign ${campaign.id}: ${response.statusText}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error aggregating analytics for campaign ${campaign.id}. Could not send to Kemet: ${error.message}`,
        );
      }
    }

    this.logger.log("Analytics aggregation completed.");
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CampaignService } from "src/campaign/campaign.service";
// import { AnalyticsService } from "src/analytics/analytics.service";
import { CreateImpressionDto } from "./impression.dto";
import { SessionDto } from "src/session/session.dto";

@Injectable()
export class ImpressionService {
  logger = new Logger(ImpressionService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaign: CampaignService,
    // private readonly analytics: AnalyticsService,
  ) {}

  async track(
    campaignSlug: string,
    { sessionId, ...session }: CreateImpressionDto,
  ) {
    // Validate campaign existence
    const campaign = await this.campaign.findBySlug(campaignSlug);
    if (!campaign) {
      throw new Error(`Campaign with slug ${campaignSlug} does not exist`);
    }

    return this.prisma.impression.create({
      data: {
        sessionId,
        campaign: {
          connect: { id: campaign.id },
        },
        session,
      },
    });
  }

  async fill(
    distributionId: string,
    campaignId: string,
    { sessionId, ...session }: SessionDto,
  ) {
    // find empty impressions for the distribution
    const [emptyImpression] = await this.prisma.impression.findMany({
      where: {
        campaign: {
          id: campaignId,
        },
        distributionId: {
          isSet: false,
        },
      },
    });

    if (!emptyImpression?.id) {
      // create an impression for the campaign and distribution
      this.logger.log(
        `No empty impressions found for campaign ${campaignId} and distribution ${distributionId}, creating a new one`,
      );

      await this.prisma.impression.create({
        data: {
          sessionId,
          session: session || {},
          campaign: {
            connect: {
              id: campaignId,
            },
          },
          distribution: {
            connect: {
              id: distributionId,
            },
          },
        },
      });
      return;
    }

    await this.prisma.impression.update({
      where: {
        id: emptyImpression.id,
      },
      data: {
        distribution: {
          connect: {
            id: distributionId,
          },
        },
      },
    });

    this.logger.log(
      `Filled impression ${emptyImpression.id} for distribution ${distributionId}`,
    );
  }

  // async recordImpression({
  //   campaignSlug,
  //   placementId,
  //   sessionId,
  //   deviceType,
  //   isBot,
  //   referer,
  //   ip,
  //   meta,
  //   userAgent,
  // }: {
  //   campaignSlug: string;
  //   placementId?: string;
  //   sessionId: string;
  //   deviceType: string;
  //   isBot: boolean;
  //   referer?: string;
  //   ip?: string;
  //   meta?: Record<string, string>;
  //   userAgent?: string;
  // }) {
  //   // Validate campaign existence
  //   const campaignExists = await this.campaign.findBySlug(campaignSlug);
  //   if (!campaignExists)
  //     throw new Error(`Campaign with ID ${campaignSlug} does not exist`);

  //   const data = {
  //     campaign: {
  //       connect: {
  //         id: campaignExists.id,
  //       },
  //     },
  //     sessionId,
  //     userAgent,
  //     ip,
  //     referer,
  //     deviceType,
  //     data: meta,
  //     isBot,
  //   } as Prisma.ImpressionCreateInput;

  //   if (placementId) {
  //     data.placement = {
  //       connect: {
  //         id: placementId,
  //       },
  //     };
  //   }

  //   await this.analytics.recordImpression(campaignExists.id);

  //   return this.prisma.impression.create({
  //     data,
  //   });
  // }
}

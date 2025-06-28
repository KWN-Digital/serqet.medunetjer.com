import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CampaignService } from "src/campaign/campaign.service";
// import { AnalyticsService } from "src/analytics/analytics.service";
import { CreateImpressionDto } from "./impression.dto";
import { SessionDto } from "src/session/session.dto";
import moment from "moment";
import { Prisma } from "@prisma/client";

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
    { campaignId, productId }: { campaignId?: string; productId?: string },
    { sessionId, ...session }: SessionDto,
  ) {
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const findImpression: Prisma.ImpressionWhereInput = {
      distributionId: {
        isSet: false,
      },
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (productId) {
      findImpression.campaign = {
        id: campaignId,
      };
    }

    // find empty impressions for the distribution
    const [emptyImpression] = await this.prisma.impression.findMany({
      where: {
        ...findImpression,
        // sessionId,
      },
    });
    if (emptyImpression) {
      return await this.prisma.impression.update({
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
    }

    try {
      await this.prisma.distribution.update({
        where: { id: distributionId },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error) {}

    // create an impression for the campaign and distribution
    this.logger.log(
      `No empty impressions found for ${campaignId ? "campaign" : "product"} ${campaignId ? campaignId : productId} and distribution ${distributionId}, creating a new one`,
    );
    const data: Prisma.ImpressionCreateInput = {
      sessionId,
      session: session || {},
      distribution: {
        connect: {
          id: distributionId,
        },
      },
    };

    if (campaignId) {
      data.campaign = {
        connect: {
          id: campaignId,
        },
      };
    }

    if (productId) {
      data.product = {
        connect: {
          id: productId,
        },
      };
    }

    return await this.prisma.impression.create({ data });
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

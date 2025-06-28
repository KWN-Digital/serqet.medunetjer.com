import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionDto } from "src/session/session.dto";

@Injectable()
export class ClickService {
  constructor(private readonly prisma: PrismaService) {}

  async track(
    distributionId: string,
    campaignId: string,
    { sessionId, ...session }: SessionDto,
  ) {
    // update the distribution when a click is tracked
    try {
      await this.prisma.distribution.update({
        where: { id: distributionId },
        data: {
          updatedAt: new Date(),
        },
      });
    } catch (error) {}

    return this.prisma.click.create({
      data: {
        sessionId,
        distribution: {
          connect: { id: distributionId },
        },
        campaign: campaignId ? { connect: { id: campaignId } } : undefined,
        session,
      },
    });
  }
}

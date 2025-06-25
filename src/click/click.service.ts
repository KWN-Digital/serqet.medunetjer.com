import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionDto } from "src/session/session.dto";

@Injectable()
export class ClickService {
  constructor(private readonly prisma: PrismaService) {}

  async track(distributionId: string, { sessionId, ...session }: SessionDto) {
    return this.prisma.click.create({
      data: {
        sessionId,
        distribution: {
          connect: { id: distributionId },
        },
        session,
      },
    });
  }
}

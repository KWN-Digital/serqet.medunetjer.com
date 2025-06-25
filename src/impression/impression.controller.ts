import { Controller, Get, Logger, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ImpressionService } from "./impression.service";
import { SessionService } from "src/session/session.service";

@Controller("i")
export class ImpressionController {
  logger = new Logger(ImpressionController.name);

  constructor(
    private readonly impressionService: ImpressionService,
    private readonly session: SessionService,
  ) {}

  @Get()
  async track(
    @Query() {
      campaign: campaignId,
    }: {
      campaign: string;
    },
    @Res() res: Response,
  ) {
    const impression = await this.impressionService.track(campaignId, {
      sessionId: this.session.getSessionId(),
      userAgent: this.session.getHeaders("user-agent") as string,
      ip: this.session.getIpAddress() as string,
      referer: this.session.getReferer() as string,
    });

    // Transparent pixel for image beacon support
    const img = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64",
    );

    this.logger.log(
      `Recorded impression: ${impression.id} for campaign: ${campaignId}`,
    );

    res.set("Content-Type", "image/gif");
    res.send(img);
  }
}

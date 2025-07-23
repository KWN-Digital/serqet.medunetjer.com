import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { RedirectService } from "./redirect.service";
import { Response } from "express";
import { SessionService } from "src/session/session.service";

@Controller()
export class RedirectController {
  constructor(
    private readonly redirectService: RedirectService,
    private readonly session: SessionService,
  ) {}

  @Get("place")
  async place(@Res() res: Response, @Query() query: { placementId?: string }) {
    const placed = await this.redirectService.place(query);
    return res.json(placed);
  }

  @Get(":slug")
  async redirect(@Param("slug") slug: string, @Res() res: Response) {
    const url = await this.redirectService.redirect(slug, {
      sessionId: this.session.getSessionId(),
      ip: this.session.getIpAddress(),
      referer: this.session.getReferer(),
      isBot: this.session.isBot(),
      deviceType: this.session.getDeviceType(),
    });
    await res.redirect(url);
  }
}

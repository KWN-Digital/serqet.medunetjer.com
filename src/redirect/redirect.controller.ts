import { Controller, Get, Param, Res } from "@nestjs/common";
import { RedirectService } from "./redirect.service";
import { Response } from "express";
import { SessionService } from "src/session/session.service";

@Controller()
export class RedirectController {
  constructor(
    private readonly redirectService: RedirectService,
    private readonly session: SessionService,
  ) {}

  @Get(":slug")
  async redirect(@Param("slug") slug: string, @Res() res: Response) {
    const url = await this.redirectService.redirect(slug, {
      sessionId: this.session.getSessionId(),
      ip: this.session.getIpAddress(),
    });
    await res.redirect(url);
  }
}

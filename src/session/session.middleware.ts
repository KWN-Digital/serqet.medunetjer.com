// session.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(
    req: Request & { sessionId?: string },
    res: Response,
    next: NextFunction,
  ) {
    let sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Attach to request so it's available downstream
    req.sessionId = sessionId;
    next();
  }
}

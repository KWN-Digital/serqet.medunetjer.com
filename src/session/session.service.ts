import { UAParser } from "ua-parser-js";
import { Injectable, Scope, Inject } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";

/**
 * used to consistently record data in a sessions.
 */
@Injectable({ scope: Scope.REQUEST })
export class SessionService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  private _sessionId: string;

  getHeaders(header?: string): string | undefined | Record<string, string> {
    if (header) {
      const value = this.request.headers[header];
      return value?.toString();
    }
    return this.request.headers as Record<string, string>;
  }

  getQuery(
    query?: string
  ): Record<string, string> | string | string[] | undefined {
    if (query) {
      const value = this.request.query[query]?.toString();
      return value;
    }
    return this.request.query as Record<string, string>;
  }

  /**
   * Generates a unique session ID.
   * @returns {string} A unique session ID.
   */
  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Retrieves the session ID from the headers or generates a new one if not present.
   * @param {Record<string, string>} headers - The request headers.
   * @returns {string} The session ID.
   */
  getSessionId() {
    if (this._sessionId) return this._sessionId;

    this._sessionId =
      this.request.query.sessionId?.toString() ||
      (this.getQuery("sessionid") as string) ||
      this.generateSessionId();

    return this._sessionId;
  }

  /**
   * Parses the user agent string to extract device information.
   * @param {string} userAgent - The user agent string.
   * @returns {UAParser} An instance of UAParser with parsed user agent data.
   */
  parseAgent() {
    const userAgent = this.getHeaders("user-agent") as string;
    return new UAParser(userAgent);
  }

  /**
   * Extracts the device type from the user agent.
   * @param {UAParser} parser - An instance of UAParser.
   * @returns {string} The device type (mobile, tablet, or desktop).
   */
  getIpAddress(): string | undefined {
    const xForwardedFor = this.getHeaders("x-forwarded-for");
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0]; // Return the first IP if it's an array
    }
    if (typeof xForwardedFor === "string") {
      return xForwardedFor.split(",")[0]; // Return the first IP if it's a comma-separated string
    }
    if (typeof xForwardedFor === "undefined") {
      return this.request.socket.remoteAddress || this.request.ip || "";
    }

    return (
      this.getHeaders("x-forwarded-for")?.toString() ||
      this.getHeaders("cf-connecting-ip")?.toString()
    );
  }

  /**
   * Determines the device type based on the user agent.
   * @param {UAParser} parser - An instance of UAParser.
   * @returns {string} The device type (mobile, tablet, or desktop).
   */
  getDeviceType(): string {
    const agent = this.parseAgent();
    const deviceType = agent.getDevice().type;
    return deviceType || "desktop";
  }

  /**
   * Determines if the user agent is a bot.
   * @param {string} userAgent - The user agent string.
   * @returns {boolean} True if the user agent is a bot, false otherwise.
   */
  isBot(): boolean {
    const agent = this.parseAgent();
    let isBot = agent.getOS().name === "Bot";
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /slurp/i,
      /headless/i,
      /facebookexternalhit/i,
      /pingdom/i,
      /curl/i,
      /python-requests/i,
      /monitoring/i,
    ];

    if (!isBot) {
      isBot = botPatterns.some((pattern) =>
        pattern.test(this.getHeaders("user-agent") as string)
      );
    }

    return isBot;
  }

  getReferer(): string | undefined {
    const referer = this.getHeaders("referer");
    if (Array.isArray(referer)) {
      return referer[0]; // Return the first referer if it's an array
    }
    return referer as string | undefined; // Return as string or undefined
  }

  getLocation(): string | undefined {
    const xGeoCountry = this.getHeaders("x-geo-country");
    if (Array.isArray(xGeoCountry)) {
      return xGeoCountry[0] as string; // Return the first country if it's an array
    }
    return xGeoCountry as string | undefined; // Return as string or undefined
  }
}

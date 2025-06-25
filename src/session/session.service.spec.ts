import { Test, TestingModule } from "@nestjs/testing";
import { SessionService } from "./session.service";
import { Request } from "express";
import { REQUEST } from "@nestjs/core";

describe("SessionService", () => {
  let service: SessionService;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    // Mock request object with default values
    mockRequest = {
      headers: {},
      query: {},
      ip: "127.0.0.1",
      // @ts-ignore - Mocking socket property
      socket: {
        remoteAddress: "127.0.0.1",
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getHeaders", () => {
    it("should return specific header value when header name is provided", () => {
      mockRequest.headers = { "user-agent": "test-agent" };
      expect(service.getHeaders("user-agent")).toBe("test-agent");
    });

    it("should return all headers when no header name is provided", () => {
      mockRequest.headers = { "user-agent": "test-agent", accept: "*/*" };
      expect(service.getHeaders()).toEqual({
        "user-agent": "test-agent",
        accept: "*/*",
      });
    });
  });

  describe("getQuery", () => {
    it("should return specific query value when query name is provided", () => {
      mockRequest.query = { sessionId: "test-session" };
      expect(service.getQuery("sessionId")).toBe("test-session");
    });

    it("should return all query parameters when no name is provided", () => {
      mockRequest.query = { sessionId: "test-session", page: "1" };
      expect(service.getQuery()).toEqual({
        sessionId: "test-session",
        page: "1",
      });
    });
  });

  describe("generateSessionId", () => {
    it("should generate a unique session ID", () => {
      const sessionId1 = service.generateSessionId();
      const sessionId2 = service.generateSessionId();

      expect(sessionId1).toMatch(/^session-\d+-[a-z0-9]+$/);
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe("getSessionId", () => {
    it("should return sessionId from query params if available", () => {
      mockRequest.query = { sessionId: "test-session" };
      expect(service.getSessionId()).toBe("test-session");
    });

    it("should generate new sessionId if none exists", () => {
      mockRequest.query = {};
      const sessionId = service.getSessionId();
      expect(sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    it("should return same sessionId on subsequent calls", () => {
      const firstCall = service.getSessionId();
      const secondCall = service.getSessionId();
      expect(firstCall).toBe(secondCall);
    });
  });

  describe("getDeviceType", () => {
    it('should return "mobile" for mobile user agents', () => {
      mockRequest.headers = {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)",
      };
      expect(service.getDeviceType()).toBe("mobile");
    });

    it('should return "desktop" for desktop user agents', () => {
      mockRequest.headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };
      expect(service.getDeviceType()).toBe("desktop");
    });
  });

  describe("isBot", () => {
    it("should identify known bots", () => {
      mockRequest.headers = {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      };
      expect(service.isBot()).toBe(true);
    });

    it("should return false for regular browsers", () => {
      mockRequest.headers = {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
      };
      expect(service.isBot()).toBe(false);
    });
  });

  describe("getIpAddress", () => {
    it("should return first IP from x-forwarded-for header", () => {
      mockRequest.headers = {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      };
      expect(service.getIpAddress()).toBe("203.0.113.195");
    });

    it("should fallback to socket remote address", () => {
      mockRequest.headers = {};
      // @ts-ignore - Mocking socket property
      mockRequest.socket = { remoteAddress: "127.0.0.1" };
      expect(service.getIpAddress()).toBe("127.0.0.1");
    });
  });

  describe("getLocation", () => {
    it("should return country from x-geo-country header", () => {
      mockRequest.headers = {
        "x-geo-country": "US",
      };
      expect(service.getLocation()).toBe("US");
    });

    it("should return undefined when no location header present", () => {
      mockRequest.headers = {};
      expect(service.getLocation()).toBeUndefined();
    });
  });

  describe("getReferer", () => {
    it("should return referer from headers", () => {
      mockRequest.headers = {
        referer: "https://example.com",
      };
      expect(service.getReferer()).toBe("https://example.com");
    });

    it("should return undefined when no referer present", () => {
      mockRequest.headers = {};
      expect(service.getReferer()).toBeUndefined();
    });
  });
});

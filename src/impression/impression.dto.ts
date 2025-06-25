export class CreateImpressionDto {
  userAgent: string;
  ip: string;
  referer?: string;
  sessionId: string;
}

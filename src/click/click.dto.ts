export class CreateClickDto {
  sessionId: string;
  placementId?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null>;
  referer?: string;
  deviceType: string;
  location?: string;
}

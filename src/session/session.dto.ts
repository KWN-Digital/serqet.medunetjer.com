import { IsOptional, IsString } from "class-validator";

export class SessionDto {
  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  referer?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  ipHash?: string;

  location?: string;
  deviceType?: string;
  isBot?: boolean;
  confidenceScore?: number;
}

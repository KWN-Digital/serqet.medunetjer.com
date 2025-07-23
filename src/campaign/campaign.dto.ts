import { IsString, IsOptional, IsUrl } from "class-validator";
import { CampaignStatus } from "@prisma/client"; // assuming enums exported

export class CreateCampaignDto {
  @IsString()
  externalCampaignId: string;

  @IsString()
  slug: string;

  @IsUrl()
  url: string;
}

export class UpdateCampaignDto extends CreateCampaignDto {
  @IsString()
  @IsOptional()
  status?: CampaignStatus;
}

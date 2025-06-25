import { IsString, IsOptional } from "class-validator";
import { CampaignStatus } from "@prisma/client"; // assuming enums exported

export class CreateCampaignDto {
  @IsString()
  externalCampaignId: string;

  @IsString()
  slug: string;
}

export class UpdateCampaignDto extends CreateCampaignDto {
  @IsString()
  @IsOptional()
  status?: CampaignStatus;
}

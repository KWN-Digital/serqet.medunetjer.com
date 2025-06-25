// product.dto.ts
import {
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateDistributionDto {
  @IsString()
  campaignId: string;

  @IsString()
  productId: string;

  @IsNumber()
  priority: number;

  @IsEnum(["active", "scheduled", "archived"])
  status: string;

  @IsOptional()
  @IsJSON()
  metadata?: string;
}

export class UpdateDistributionDto extends CreateDistributionDto {}

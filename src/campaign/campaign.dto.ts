import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from "class-validator";
import { CacheNamespace } from "@prisma/client"; // assuming enums exported
import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { CreateProductDto } from "src/product/product.dto";

export class CreateCampaignDto {
  @IsString()
  externalCampaignId: string;

  @IsString()
  slug: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

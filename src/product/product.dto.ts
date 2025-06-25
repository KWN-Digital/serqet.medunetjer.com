// product.dto.ts
import { IsEnum, IsJSON, IsOptional, IsString, IsUrl } from "class-validator";
import { CacheNamespace, ProductType } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  externalProductId: string;

  @IsString()
  campaignId: string;

  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsUrl()
  affiliate_link?: string;

  @IsOptional()
  @IsUrl()
  api_integration?: string;

  @IsOptional()
  @IsJSON()
  metadata?: string;

  @IsString()
  cacheKey?: string;

  @IsString()
  cacheNamespace?: CacheNamespace;
}

export class UpdateProductDto extends CreateProductDto {}

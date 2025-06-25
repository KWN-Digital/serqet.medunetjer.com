import { DistributionService } from "src/distribution/distribution.service";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  // Patch,
  // Delete,
  NotFoundException,
  Patch,
} from "@nestjs/common";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.dto";
// import { CreateProductDto } from "src/product/product.dto";

@Controller("campaign")
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly distribution: DistributionService,
  ) {}

  @Get()
  findAll() {
    return this.campaignService.findActive();
  }

  @Get(":externalCampaignId")
  findByExternalCampaignId(
    @Param("externalCampaignId") externalCampaignId: string,
  ) {
    return this.campaignService.findByExternalCampaignId(externalCampaignId);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Post(":externalCampaignId/publish")
  async publish(
    @Param("externalCampaignId") externalCampaignId: string,
    @Body() dto: { products: string[] },
  ) {
    const campaign =
      await this.campaignService.findByExternalCampaignId(externalCampaignId);

    if (!campaign) {
      throw new NotFoundException(
        `Campaign with external ID ${externalCampaignId} not found`,
      );
    }

    let success = 0;
    const fail: string[] = [];

    // create distributions for each product
    for await (const externalProductId of dto.products) {
      const distribution = await this.distribution.fromCampaign(
        externalCampaignId,
        externalProductId,
      );
      if (distribution) {
        success++;
      } else {
        fail.push(externalProductId);
      }
    }

    return {
      success,
      fail,
      message: `Published ${success} products for campaign ${externalCampaignId}`,
    };
  }

  // @Patch("/:campaignId/product/:externalProductId")
  // addProductToCampaign(
  //   @Param("campaignId") campaignId: string,
  //   @Param("externalProductId") externalProductId: string,
  // ) {
  //   return this.campaignService.attachProductToCampaign(
  //     campaignId,
  //     externalProductId,
  //   );
  // }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }

  // @Delete(":id")
  // delete(@Param("id") id: string) {
  //   return this.campaignService.delete(id);
  // }
}

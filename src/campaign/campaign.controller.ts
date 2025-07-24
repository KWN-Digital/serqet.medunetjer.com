import { DistributionService } from "src/distribution/distribution.service";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Patch,
} from "@nestjs/common";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.dto";

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
    if (!externalCampaignId) {
      throw new NotFoundException("External campaign ID is required");
    }
    return this.campaignService.findByExternalCampaignId(externalCampaignId);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Post(":externalCampaignId/publish")
  async publish(
    @Param("externalCampaignId") externalCampaignId: string,
    @Body() dto: { products?: string[]; params?: string[] },
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
    if (dto.products && dto.products?.length > 0) {
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
    }

    // create distributions for each param
    if (dto.params && dto.params.length > 0) {
      for await (const externalParamId of dto.params) {
        const distribution = await this.distribution.fromCampaignParam(
          externalCampaignId,
          externalParamId,
        );
        if (distribution) {
          success++;
        } else {
          fail.push(externalParamId);
        }
      }
    }

    return {
      success,
      fail,
      message: `Published ${success} products for campaign ${externalCampaignId}`,
    };
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }
}

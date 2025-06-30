import { HttpException, Injectable, Logger } from "@nestjs/common";
import { CacheNamespace, Campaign, Product, ProductType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./product.dto";
import { RedisService } from "../redis/redis.service";

type KemetProduct = {
  url: string;
  id: string;
  type: ProductType;
};

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(resourceId: string, resource = "externalId"): string {
    return `${CacheNamespace.product}:${resource}:${resourceId}`;
  }

  async findOrCreate(
    externalProductId: string,
    campaignId: Campaign["id"],
  ): Promise<Product | null> {
    const cachedProduct = await this.getCachedProduct(externalProductId);
    if (cachedProduct) {
      this.logger.log(
        `Cache hit for product with external ID: ${externalProductId}`,
      );
      return cachedProduct;
    }

    const product = await this.findProductByExternalId(externalProductId);
    if (product) {
      this.logger.log(
        `Found existing product with external ID: ${externalProductId}`,
      );
      return product;
    }

    // get the product from Kemet
    const kemetProduct = await this.getKemetProduct(externalProductId);
    if (!kemetProduct) {
      this.logger.error(
        `Kemet product with external ID ${externalProductId} not found.`,
      );
      throw new HttpException(
        `Kemet product with external ID ${externalProductId} not found.`,
        404, // Not Found
      );
    }

    const { id, type, url } = kemetProduct;

    // If not found, create a new product
    // You need to provide all required fields for CreateProductDto
    const newProduct = await this.create({
      campaignId, // or provide a valid campaignId
      externalProductId: id,
      type,
      [type]: url,
    });
    this.logger.log(
      `Created new product with external ID: ${externalProductId}`,
    );
    return newProduct;
  }

  async findProductByExternalId(
    externalProductId: string,
  ): Promise<Product | null> {
    if (!externalProductId) {
      this.logger.error("External product ID is required");
      throw new HttpException("External product ID is required", 400); // Bad Request
    }

    const key = this.cacheKey(externalProductId);
    const cached = await this.redis.get<Product>(key);
    if (cached) {
      this.logger.log(
        `Cache hit for product with external ID: ${externalProductId}`,
      );
      return cached;
    }

    this.logger.log(
      `Cache miss for product with external ID: ${externalProductId}`,
    );

    const product = await this.prisma.product.findFirst({
      where: { externalProductId },
    });

    if (!product) return null;
    await this.cacheProduct(product);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    // Check if product already exists by external ID
    const existingProduct = await this.findProductByExternalId(
      dto.externalProductId,
    );

    if (existingProduct) {
      const msg = `Product with external ID ${dto.externalProductId} already exists.`;
      this.logger.log(msg);
      throw new HttpException(
        msg,
        409, // Conflict
      );
    }
    // lets pull data from kement
    const kemetProduct = await this.getKemetProduct(dto.externalProductId);
    if (!kemetProduct) {
      const msg = `Kemet product with external ID ${dto.externalProductId} not found.`;
      this.logger.error(msg);
      throw new HttpException(msg, 404); // Not Found
    }

    // Check if the product type is valid
    if (!Object.values(ProductType).includes(kemetProduct.type)) {
      const msg = `Invalid product type ${kemetProduct.type} for external ID ${dto.externalProductId}.`;
      this.logger.error(msg);
      throw new HttpException(msg, 400); // Bad Request
    }

    const { id, type, url } = kemetProduct;

    const product = await this.prisma.product.create({
      data: {
        externalCampaignId: dto.campaignId,
        externalProductId: id,
        type: type,
        [type]: url,
      },
      include: {
        distributions: true,
      },
    });

    await this.cacheProduct(product);
    return product;
  }

  private async cacheProduct(product: Product, ttlSeconds = 3600) {
    const key = this.cacheKey(product.externalProductId);
    this.logger.log(`Caching campaign with key: ${key}`);
    await this.redis.set(key, product, ttlSeconds);
  }

  private async getCachedProduct(id: string): Promise<Product | null> {
    const key = this.cacheKey(id);
    const cachedProduct = await this.redis.get<Product>(key);
    if (cachedProduct) {
      this.logger.log(`Cache hit for product with key: ${key}`);
      return cachedProduct;
    }
    this.logger.log(`Cache miss for product with key: ${key}`);
    return null;
  }

  private async invalidateCache(id: string) {
    const key = this.cacheKey(id);
    this.logger.log(`Invalidating cache for key: ${key}`);
    await this.redis.del(key);
  }

  private async getKemetProduct(
    externalProductId: string,
  ): Promise<KemetProduct | null> {
    const key = this.cacheKey(externalProductId, "kemet");
    const cached = await this.redis.get<KemetProduct>(key);
    if (cached) {
      this.logger.log(
        `Cache hit for Kemet product with external ID: ${externalProductId}`,
      );
      return cached;
    }

    const response = await fetch(
      `${process.env.KEMET_API_URL}/product/${externalProductId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.KEMET_API_SECRET}`,
        },
      },
    );
    if (!response.ok) {
      this.logger.error(response.statusText);
      this.logger.error(
        `Failed to fetch Kemet product with external ID: ${externalProductId}`,
      );
      return null;
    }
    const { product } = await response.json();
    if (!product.id) {
      this.logger.error(
        `Kemet product with external ID ${externalProductId} does not have an ID`,
      );
      return null;
    }
    this.redis.set<KemetProduct>(key, product, 3600); // Cache for 1 hour
    this.logger.log(
      `Cached Kemet product with external ID: ${externalProductId}`,
    );
    return product;
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }
}

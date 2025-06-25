import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { SessionMiddleware } from "./session/session.middleware";
import * as cookieParser from "cookie-parser";

const logger = new Logger("Bootstrap");
const PORT = process.env.PORT || 80;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // must come before
  app.use(new SessionMiddleware().use);
  await app.listen(PORT);
  logger.log(`Application is running on: http://localhost:${PORT}`);
  logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.log(`has database uri: ${!!process.env.DATABASE_URI}`);
  logger.log(
    `has redis url: ${!!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN}`,
  );
}
bootstrap();

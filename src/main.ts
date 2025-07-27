import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureWebSettings } from './configs/web.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Call the web configuration method here
  configureWebSettings(app); // Ensure this is called with the base instance
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();

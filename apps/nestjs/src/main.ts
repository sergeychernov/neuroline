import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS для фронтенда
  app.enableCors();

  const port = process.env.PORT ?? 3003;
  await app.listen(port);

  console.log(`🚀 NestJS Neuroline Example running on http://localhost:${port}`);
  console.log(`📚 Pipeline API: http://localhost:${port}/pipeline`);
}

bootstrap();


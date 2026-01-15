import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS для фронтенда
  app.enableCors();

  // Validate and parse PORT environment variable
  let port = 3003;
  if (process.env.PORT) {
    const parsedPort = parseInt(process.env.PORT, 10);
    if (isNaN(parsedPort)) {
      throw new Error(`Invalid PORT environment variable: "${process.env.PORT}" is not a valid number`);
    }
    if (parsedPort < 1 || parsedPort > 65535) {
      throw new Error(`Invalid PORT environment variable: ${parsedPort} must be between 1 and 65535`);
    }
    port = parsedPort;
  }

  await app.listen(port);

  console.log(`🚀 NestJS Neuroline Example running on http://localhost:${port}`);
  console.log(`📚 Pipeline API: http://localhost:${port}/pipeline`);
}

bootstrap();


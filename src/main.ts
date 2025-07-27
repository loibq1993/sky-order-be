import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);



  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable validation pipe (disable transform to avoid multipart issues)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: false, // Disable transform to avoid multipart/form-data parsing issues
  }));

  // Enable CORS for frontend communication
  app.enableCors({
    origin: configService.get('app.cors.origin'),
    methods: configService.get('app.cors.methods'),
    allowedHeaders: configService.get('app.cors.allowedHeaders'),
    credentials: configService.get('app.cors.credentials'),
  });

  // Setup Swagger documentation
  setupSwagger(app);

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/api/',
  });

  const port = configService.get('app.port', 4500);
  await app.listen(port);
}
bootstrap();

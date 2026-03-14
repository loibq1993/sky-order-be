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

  // Increase payload limits for base64 images in JSON bodies
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));


  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable validation pipe (disable transform to avoid multipart issues)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: false, // Disable transform to avoid multipart/form-data parsing issues
  }));

  // Enable CORS for frontend communication
  const corsOriginList = configService.get('app.cors.origin') || [];
  const corsMethods = configService.get('app.cors.methods') || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  const configuredHeaders = configService.get('app.cors.allowedHeaders') || [];
  const requiredHeaders = ['Content-Type', 'Authorization', 'Accept', 'X-Restaurant-ID', 'x-restaurant-id'];
  const corsHeaders = [...new Set([...requiredHeaders, ...configuredHeaders])];
  const corsCredentials = configService.get('app.cors.credentials') !== undefined ? configService.get('app.cors.credentials') : true;

  // CORS origin: exact list, wildcards (http://localhost:*), or CORS_ORIGIN=* to allow all (server).
  const allowAllOrigins = corsOriginList.includes('*');
  const originFn = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin) return callback(null, true); // No Origin header
    if (allowAllOrigins || corsOriginList.length === 0) return callback(null, origin);
    const allowed = corsOriginList.some((allowedOrigin: string) => {
      if (allowedOrigin.includes('*')) {
        const prefix = allowedOrigin.replace(/\*$/, '');
        return origin === prefix || origin.startsWith(prefix);
      }
      return origin === allowedOrigin;
    });
    callback(null, allowed ? origin : false);
  };

  app.enableCors({
    origin: originFn,
    methods: corsMethods,
    allowedHeaders: corsHeaders,
    credentials: corsCredentials,
    exposedHeaders: ['X-Restaurant-ID', 'x-restaurant-id'],
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

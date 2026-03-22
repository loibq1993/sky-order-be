import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // WebSocket: Socket.IO (call-staff real-time)
  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS: allow any origin (no corsOriginList check), required for FE from any domain
  const configuredHeaders = configService.get('app.cors.allowedHeaders') || [];
  const allowedHeaders = [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Tenant-Domain',
    'x-tenant-domain',
    'X-Client-Host',
    'x-client-host',
    ...configuredHeaders,
  ];
  app.enableCors({
    origin: true, // reflect request origin (any domain)
    credentials: configService.get('app.cors.credentials') !== false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [...new Set(allowedHeaders)],
    exposedHeaders: ['X-Tenant-Domain', 'x-tenant-domain'],
  });

  // data:image/jpeg;base64,... có thể ~7MB chuỗi cho ảnh 5MB
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable validation pipe (disable transform to avoid multipart issues)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: false, // Disable transform to avoid multipart/form-data parsing issues
  }));

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

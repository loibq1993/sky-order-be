import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { CorsAllowedOriginsService } from './cors/cors-allowed-origins.service';
import { setCorsAllowedOriginsService } from './cors/cors-registry';
import { setupSwagger } from './swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins = app.get(CorsAllowedOriginsService);
  await corsOrigins.warmup();
  setCorsAllowedOriginsService(corsOrigins);

  // WebSocket: Socket.IO (call-staff real-time)
  app.useWebSocketAdapter(new IoAdapter(app));

  const corsFromDb = configService.get<boolean>('app.cors.originFromDb') === true;
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
    origin: corsFromDb
      ? (origin, callback) => {
          callback(null, corsOrigins.isAllowed(origin) ? origin || true : false);
        }
      : true,
    credentials: configService.get('app.cors.credentials') !== false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [...new Set(allowedHeaders)],
    exposedHeaders: ['X-Tenant-Domain', 'x-tenant-domain'],
    maxAge: 86400,
  });

  // data:image/jpeg;base64,... có thể ~7MB chuỗi cho ảnh 5MB
  app.use(
    express.json({
      limit: '12mb',
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        if (req.originalUrl?.includes('/payments/stripe/webhook') ||
          req.originalUrl?.includes('/payments/sepay/webhook')) {
          req.rawBody = buf;
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // transform must be enabled so @Type/@ValidateNested preserve nested DTO fields (e.g. order items).
  // Multipart upload DTOs only use simple fields (folder string) and work fine with transform.
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
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

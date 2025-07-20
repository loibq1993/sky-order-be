import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: [
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:3000',
      'http://172.16.4.9:8000',  // User's specific IP
      'http://172.16.4.9:*',     // Any port on user's IP
      'http://localhost:*',       // Any port on localhost
      'http://127.0.0.1:*'       // Any port on 127.0.0.1
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend server running on http://localhost:3000');
  console.log('CORS enabled for frontend communication');
}
bootstrap();

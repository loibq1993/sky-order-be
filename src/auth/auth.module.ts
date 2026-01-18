import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../entities/user.entity';
import { Restaurant } from '../entities/restaurant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Restaurant]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.security.jwtSecret') || configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { 
          expiresIn: (configService.get<string>('app.security.jwtExpiresIn') || configService.get<string>('JWT_EXPIRES_IN') || '24h') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PlatformUser } from '../entities/platform-user.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantModule } from '../tenant/tenant.module';
import { ResolveTenantFromDomainGuard } from './guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUser, Tenant]),
    TenantModule,
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
  providers: [AuthService, JwtStrategy, LocalStrategy, ResolveTenantFromDomainGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

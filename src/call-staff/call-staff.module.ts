import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CallStaffService } from './call-staff.service';
import { CallStaffGateway } from './call-staff.gateway';
import { ClientCallStaffController } from './client-call-staff.controller';
import { ClientRequestPaymentController } from './client-request-payment.controller';
import { AdminCallStaffController } from './admin-call-staff.controller';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@Module({
  imports: [
    AuthModule,
    TenantModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('app.security.jwtSecret') ||
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key',
        signOptions: {
          expiresIn:
            (configService.get<string>('app.security.jwtExpiresIn') ||
              configService.get<string>('JWT_EXPIRES_IN') ||
              '24h') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ClientCallStaffController, ClientRequestPaymentController, AdminCallStaffController],
  providers: [CallStaffService, CallStaffGateway, ResolveTenantFromDomainGuard],
  exports: [CallStaffService],
})
export class CallStaffModule {}

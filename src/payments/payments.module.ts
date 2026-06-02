import { Module } from '@nestjs/common';
import { ClientPaymentsController } from './client-payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, NotificationsModule, AuthModule],
  controllers: [ClientPaymentsController, StripeWebhookController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}

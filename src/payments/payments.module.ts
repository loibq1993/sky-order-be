import { Module } from '@nestjs/common';
import { ClientPaymentsController } from './client-payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { SepayWebhookController } from './sepay-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { SepayService } from './sepay.service';
import { TenantModule } from '../tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, NotificationsModule, AuthModule],
  controllers: [ClientPaymentsController, StripeWebhookController, SepayWebhookController],
  providers: [PaymentsService, StripeService, SepayService],
  exports: [PaymentsService, StripeService, SepayService],
})
export class PaymentsModule {}

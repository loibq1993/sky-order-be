import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Param,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@ApiExcludeController()
@Controller('payments/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /** Per-tenant webhook — register this URL on each restaurant's Stripe Dashboard. */
  @Post('webhook/:restaurantId')
  @HttpCode(HttpStatus.OK)
  async handleTenantWebhook(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = this.readRawBody(req);
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    await this.paymentsService.handleStripeWebhook(rawBody, signature, restaurantId);
    return { received: true };
  }

  /** @deprecated Use POST /api/payments/stripe/webhook/{restaurantId} */
  @Post('webhook')
  @HttpCode(HttpStatus.GONE)
  async handleLegacyWebhook(): Promise<never> {
    throw new BadRequestException(
      'Shared Stripe webhook is disabled. Register per-restaurant URL: ' +
        'POST /api/payments/stripe/webhook/{restaurantId} (see Admin → Settings → Stripe).',
    );
  }

  private readRawBody(req: Request & { rawBody?: Buffer }): Buffer {
    const rawBody = req.rawBody ?? (req.body as Buffer | undefined);
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('Stripe webhook: missing raw body (check express.json verify hook)');
      throw new BadRequestException('Missing raw body for Stripe webhook');
    }
    return rawBody;
  }
}

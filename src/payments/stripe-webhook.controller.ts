import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody ?? (req.body as Buffer | undefined);
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('Stripe webhook: missing raw body (check express.json verify hook)');
      throw new BadRequestException('Missing raw body for Stripe webhook');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    await this.paymentsService.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }
}

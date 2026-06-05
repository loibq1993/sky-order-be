import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@ApiExcludeController()
@Controller('payments/sepay')
export class SepayWebhookController {
  private readonly logger = new Logger(SepayWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/:restaurantId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-sepay-signature') signature: string,
    @Headers('x-sepay-timestamp') timestamp: string,
  ): Promise<{ success: boolean }> {
    const rawBody = this.readRawBody(req);
    this.logger.log(`SePay webhook for tenant ${restaurantId}`);
    await this.paymentsService.handleSepayWebhook(
      restaurantId,
      rawBody,
      signature,
      timestamp,
    );
    return { success: true };
  }

  private readRawBody(req: Request & { rawBody?: Buffer }): Buffer {
    const rawBody = req.rawBody ?? (req.body as Buffer | undefined);
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('SePay webhook: missing raw body (check express.json verify hook)');
      throw new BadRequestException('Missing raw body for SePay webhook');
    }
    return rawBody;
  }
}

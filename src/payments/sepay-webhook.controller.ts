import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
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
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`SePay webhook for tenant ${restaurantId}`);
    await this.paymentsService.handleSepayWebhook(restaurantId, body);
    return { success: true };
  }
}

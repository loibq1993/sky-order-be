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
@Controller('payments/sepay/pg')
export class SepayPgIpnController {
  private readonly logger = new Logger(SepayPgIpnController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ipn/:restaurantId')
  @HttpCode(HttpStatus.OK)
  async handleIpn(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`SePay PG IPN for tenant ${restaurantId}`);
    await this.paymentsService.handleSepayPgIpn(restaurantId, body);
    return { success: true };
  }
}

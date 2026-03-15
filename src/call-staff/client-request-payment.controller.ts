import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { CallStaffGateway } from './call-staff.gateway';
import { NotificationsService } from '../notifications/notifications.service';

class RequestPaymentDto {
  @ApiPropertyOptional({ description: 'Table number (e.g. from URL)' })
  @IsOptional()
  @IsString()
  tableNumber?: string;
}

@ApiTags('request-payment-client')
@Controller('client/request-payment')
@UseGuards(ResolveTenantFromDomainGuard)
export class ClientRequestPaymentController {
  constructor(
    private readonly callStaffGateway: CallStaffGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Request payment (e.g. from table history)' })
  @ApiResponse({ status: 201, description: 'Request registered' })
  @ApiResponse({ status: 401, description: 'Tenant context required' })
  async request(
    @RestaurantId() restaurantId: string,
    @Body() dto: RequestPaymentDto,
  ): Promise<{ ok: boolean }> {
    const tableNumber = dto?.tableNumber ?? '';
    const payload = { tableNumber: tableNumber || '?', requestedAt: Date.now() };
    this.callStaffGateway.emitRequestPaymentToRestaurant(restaurantId, payload);

    await this.notificationsService.create(restaurantId, {
      type: 'request_payment',
      title: `Bàn ${tableNumber || '?'} yêu cầu thanh toán`,
      message: 'Khách yêu cầu nhân viên ra bill / thanh toán.',
      tableNumber: tableNumber || null,
    });

    return { ok: true };
  }
}

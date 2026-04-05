import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { CallStaffService } from './call-staff.service';
import { CallStaffGateway } from './call-staff.gateway';
import { NotificationsService } from '../notifications/notifications.service';

class CallStaffDto {
  @ApiPropertyOptional({ description: 'Table number (e.g. from URL)' })
  @IsOptional()
  @IsString()
  tableNumber?: string;
}

@ApiTags('call-staff-client')
@Controller('client/call-staff')
export class ClientCallStaffController {
  constructor(
    private readonly callStaffService: CallStaffService,
    private readonly callStaffGateway: CallStaffGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Call staff (e.g. from table)' })
  @ApiResponse({ status: 201, description: 'Call registered' })
  @ApiResponse({ status: 401, description: 'Tenant context required' })
  async call(
    @RestaurantId() restaurantId: string,
    @Body() dto: CallStaffDto,
  ): Promise<{ ok: boolean }> {
    const tableNumber = dto?.tableNumber ?? '';
    this.callStaffService.addCall(restaurantId, tableNumber);
    const payload = { tableNumber: tableNumber || '?', calledAt: Date.now() };
    this.callStaffGateway.emitCallToRestaurant(restaurantId, payload);

    await this.notificationsService.create(restaurantId, {
      type: 'call_staff',
      title: `Bàn ${tableNumber || '?'} đang gọi phục vụ`,
      message: 'Khách yêu cầu nhân viên tới bàn.',
      tableNumber: tableNumber || null,
    });

    return { ok: true };
  }
}

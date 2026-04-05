import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { CallStaffService, StaffCall } from './call-staff.service';

@ApiTags('call-staff-admin')
@Controller('admin/call-staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'super_admin',
  'restaurant_owner',
  'restaurant_manager',
  'restaurant_staff',
  'staff_reception',
  'staff_kitchen',
  'staff_waiter',
)
@ApiBearerAuth()
export class AdminCallStaffController {
  constructor(private readonly callStaffService: CallStaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get staff calls since timestamp (for polling)' })
  @ApiQuery({ name: 'since', required: true, description: 'Unix ms - return calls after this time' })
  @ApiResponse({ status: 200, description: 'List of calls' })
  async getCallsSince(
    @RestaurantId() restaurantId: string,
    @Query('since') since: string,
  ): Promise<{ calls: StaffCall[] }> {
    const sinceNum = parseInt(since, 10) || 0;
    const calls = this.callStaffService.getCallsSince(restaurantId, sinceNum);
    return { calls };
  }
}

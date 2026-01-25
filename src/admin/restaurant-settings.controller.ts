import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { AdminService } from './admin.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@ApiTags('Admin')
@Controller('admin/restaurant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff')
@ApiBearerAuth()
export class RestaurantSettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get current restaurant (admin/self)' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant retrieved successfully',
  })
  async getCurrentRestaurant(@RestaurantId() restaurantId?: string) {
    if (!restaurantId) {
      throw new BadRequestException('Restaurant context is required');
    }
    return this.adminService.findRestaurantById(restaurantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update current restaurant (admin/self)' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant updated successfully',
  })
  async updateCurrentRestaurant(
    @RestaurantId() restaurantId: string | undefined,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    if (!restaurantId) {
      throw new BadRequestException('Restaurant context is required');
    }
    return this.adminService.updateRestaurant(restaurantId, updateRestaurantDto);
  }
}

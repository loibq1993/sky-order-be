import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { AdminService } from './admin.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('tenant-users')
@Controller('admin/tenant-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class TenantUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách user trong tenant (chủ / quản lý / super admin + restaurantId)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 100,
    @Query('search') search: string | undefined,
    @RestaurantId() restaurantId: string,
  ) {
    return this.adminService.findAllUsers(page, limit, search, restaurantId);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo user trong tenant' })
  async create(
    @Body() body: CreateTenantUserDto,
    @RestaurantId() restaurantId: string,
    @Req() req: Request,
  ) {
    const u = req.user as { userId: string; role: string };
    const dto = { ...body, restaurantId };
    return this.adminService.createUserForTenant(dto, u.role, u.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết user trong tenant' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @RestaurantId() restaurantId: string) {
    return this.adminService.findUserById(id, restaurantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật user trong tenant' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @RestaurantId() restaurantId: string,
    @Req() req: Request,
  ) {
    const u = req.user as { userId: string; role: string };
    return this.adminService.updateUserForTenant(id, updateUserDto, restaurantId, u.role, u.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa user trong tenant' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @RestaurantId() restaurantId: string,
    @Req() req: Request,
  ) {
    const u = req.user as { userId: string; role: string };
    await this.adminService.deleteUserForTenant(id, restaurantId, u.role, u.userId);
    return { message: 'User deleted successfully' };
  }

  @Put(':id/toggle-status')
  @ApiOperation({ summary: 'Bật/tắt trạng thái user' })
  async toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @RestaurantId() restaurantId: string,
    @Req() req: Request,
  ) {
    const u = req.user as { userId: string; role: string };
    return this.adminService.toggleUserStatusForTenant(id, restaurantId, u.role, u.userId);
  }
}

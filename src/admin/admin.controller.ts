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
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateStripeSettingsDto } from './dto/update-stripe-settings.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // System Statistics
  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
  })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  // Restaurant Management
  @Post('restaurants')
  @ApiOperation({ summary: 'Create new restaurant' })
  @ApiResponse({
    status: 201,
    description: 'Restaurant created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createRestaurant(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.adminService.createRestaurant(createRestaurantDto);
  }

  @Get('restaurants')
  @ApiOperation({ summary: 'Get all restaurants with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Restaurants retrieved successfully',
  })
  async findAllRestaurants(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAllRestaurants(page, limit, search);
  }

  @Get('restaurants/:id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async findRestaurantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findRestaurantById(id);
  }

  @Get('restaurants/:id/stats')
  @ApiOperation({ summary: 'Get restaurant statistics' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async getRestaurantStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getRestaurantStats(id);
  }

  @Put('restaurants/:id')
  @ApiOperation({ summary: 'Update restaurant' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async updateRestaurant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.adminService.updateRestaurant(id, updateRestaurantDto);
  }

  @Put('restaurants/:id/stripe-settings')
  @ApiOperation({ summary: 'Update Stripe settings for restaurant (super admin)' })
  async updateRestaurantStripeSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStripeSettingsDto,
  ) {
    return this.adminService.updateStripeSettings(id, dto);
  }

  @Delete('restaurants/:id')
  @ApiOperation({ summary: 'Delete restaurant' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  async deleteRestaurant(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.deleteRestaurant(id);
    return { message: 'Restaurant deleted successfully' };
  }

  // User Management
  @Post('users')
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'restaurantId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('search') search?: string,
    @Query('restaurantId', new ParseUUIDPipe({ optional: true }))
    restaurantId?: string,
  ) {
    return this.adminService.findAllUsers(page, limit, search, restaurantId);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @RestaurantId() restaurantId?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
  ) {
    const tenantId = restaurantId ?? restaurantIdQuery;
    return this.adminService.findUserById(id, tenantId!);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @RestaurantId() restaurantId?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
  ) {
    const tenantId = restaurantId ?? restaurantIdQuery;
    return this.adminService.updateUser(id, updateUserDto, tenantId!);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @RestaurantId() restaurantId?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
  ) {
    const tenantId = restaurantId ?? restaurantIdQuery;
    await this.adminService.deleteUser(id, tenantId!);
    return { message: 'User deleted successfully' };
  }

  @Put('users/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiResponse({
    status: 200,
    description: 'User status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @RestaurantId() restaurantId?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
  ) {
    const tenantId = restaurantId ?? restaurantIdQuery;
    return this.adminService.toggleUserStatus(id, tenantId!);
  }
}

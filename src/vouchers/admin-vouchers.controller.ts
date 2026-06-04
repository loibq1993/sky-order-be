import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherResponseDto,
} from './vouchers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('admin-vouchers')
@Controller('admin/vouchers')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new voucher' })
  @ApiBody({ type: CreateVoucherDto })
  @ApiResponse({ status: 201, type: VoucherResponseDto })
  async create(
    @Body() dto: CreateVoucherDto,
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.vouchersService.create(dto, restaurantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vouchers' })
  @ApiResponse({ status: 200, type: [VoucherResponseDto] })
  async findAll(
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto[]> {
    return this.vouchersService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voucher by ID' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, type: VoucherResponseDto })
  async findOne(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.vouchersService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update voucher' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiBody({ type: UpdateVoucherDto })
  @ApiResponse({ status: 200, type: VoucherResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.vouchersService.update(id, dto, restaurantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete voucher' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  async remove(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<{ message: string }> {
    return this.vouchersService.remove(id, restaurantId);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle voucher active status' })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, type: VoucherResponseDto })
  async toggleActive(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto> {
    return this.vouchersService.toggleActive(id, restaurantId);
  }
}

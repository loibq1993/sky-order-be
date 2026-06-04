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
import { PromotionsService } from './promotions.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionResponseDto,
} from './promotions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('admin-promotions')
@Controller('admin/promotions')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product promotion' })
  @ApiBody({ type: CreatePromotionDto })
  @ApiResponse({ status: 201, type: PromotionResponseDto })
  async create(
    @Body() dto: CreatePromotionDto,
    @RestaurantId() restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.create(dto, restaurantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all promotions' })
  @ApiResponse({ status: 200, type: [PromotionResponseDto] })
  async findAll(
    @RestaurantId() restaurantId: string,
  ): Promise<PromotionResponseDto[]> {
    return this.promotionsService.findAll(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: PromotionResponseDto })
  async findOne(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update promotion' })
  @ApiBody({ type: UpdatePromotionDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @RestaurantId() restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.update(id, dto, restaurantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete promotion' })
  async remove(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<{ message: string }> {
    return this.promotionsService.remove(id, restaurantId);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle promotion active status' })
  async toggleActive(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<PromotionResponseDto> {
    return this.promotionsService.toggleActive(id, restaurantId);
  }
}

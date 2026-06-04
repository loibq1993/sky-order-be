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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CombosService } from './combos.service';
import { CreateComboDto, UpdateComboDto, ComboResponseDto } from './combos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';

@ApiTags('admin-combos')
@Controller('admin/combos')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class AdminCombosController {
  constructor(private readonly combosService: CombosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create combo' })
  async create(
    @Body() dto: CreateComboDto,
    @RestaurantId() restaurantId: string,
  ): Promise<ComboResponseDto> {
    return this.combosService.create(dto, restaurantId);
  }

  @Get()
  @ApiOperation({ summary: 'List combos' })
  async findAll(@RestaurantId() restaurantId: string): Promise<ComboResponseDto[]> {
    return this.combosService.findAll(restaurantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<ComboResponseDto> {
    return this.combosService.findOne(id, restaurantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateComboDto,
    @RestaurantId() restaurantId: string,
  ): Promise<ComboResponseDto> {
    return this.combosService.update(id, dto, restaurantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<{ message: string }> {
    return this.combosService.remove(id, restaurantId);
  }

  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<ComboResponseDto> {
    return this.combosService.toggleActive(id, restaurantId);
  }
}

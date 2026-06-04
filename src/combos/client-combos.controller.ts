import { Controller, Get, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CombosService } from './combos.service';
import { ComboResponseDto } from './combos.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('combos-client')
@Controller('client/combos')
@UseGuards(OptionalJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientCombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  @ApiOperation({ summary: 'List active combos for menu' })
  @ApiResponse({ status: 200, type: [ComboResponseDto] })
  async findActive(@RestaurantId() restaurantId: string): Promise<ComboResponseDto[]> {
    return this.combosService.findAll(restaurantId, true);
  }
}

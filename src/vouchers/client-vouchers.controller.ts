import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import {
  ValidateVoucherDto,
  VoucherPreviewResponseDto,
  VoucherResponseDto,
} from './vouchers.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('vouchers-client')
@Controller('client/vouchers')
@UseGuards(OptionalJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('available')
  @ApiOperation({ summary: 'List active vouchers for customers' })
  @ApiResponse({ status: 200, type: [VoucherResponseDto] })
  async findAvailable(
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherResponseDto[]> {
    return this.vouchersService.findAvailableForClient(restaurantId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Preview voucher discount for checkout' })
  @ApiBody({ type: ValidateVoucherDto })
  @ApiResponse({ status: 200, type: VoucherPreviewResponseDto })
  async validate(
    @Body() dto: ValidateVoucherDto,
    @RestaurantId() restaurantId: string,
  ): Promise<VoucherPreviewResponseDto> {
    return this.vouchersService.previewCheckout(restaurantId, dto);
  }
}

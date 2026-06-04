import {
  Controller,
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
} from './vouchers.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('vouchers-client')
@Controller('client/vouchers')
@UseGuards(OptionalJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

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

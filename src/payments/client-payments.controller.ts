import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
} from './payments.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('payments-client')
@Controller('client/payments')
@UseGuards(OptionalJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create Stripe Checkout session for an order' })
  @ApiResponse({ status: 201, type: CheckoutSessionResponseDto })
  async createCheckout(
    @Body() dto: CreateCheckoutSessionDto,
    @RestaurantId() restaurantId: string,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentsService.createCheckoutSession(dto.orderId, restaurantId);
  }

  @Get('order/:orderId/status')
  @ApiOperation({ summary: 'Get payment status for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, type: PaymentStatusResponseDto })
  async getOrderPaymentStatus(
    @Param('orderId') orderId: string,
    @RestaurantId() restaurantId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.getPaymentStatus(orderId, restaurantId);
  }

  @Get('session/:sessionId/sync')
  @ApiOperation({ summary: 'Sync payment status from Stripe after redirect' })
  @ApiParam({ name: 'sessionId', description: 'Stripe Checkout session ID' })
  @ApiResponse({ status: 200, type: PaymentStatusResponseDto })
  async syncSession(
    @Param('sessionId') sessionId: string,
    @RestaurantId() restaurantId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentsService.syncCheckoutSession(sessionId, restaurantId);
  }
}

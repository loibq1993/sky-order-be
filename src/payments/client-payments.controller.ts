import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
  PaymentStatusResponseDto,
  VietQrPaymentResponseDto,
} from './payments.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

function resolveFrontendOriginFromRequest(req: Request): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.trim()) return origin.trim();

  const xClient = req.headers['x-client-host'] ?? req.headers['x-tenant-domain'];
  const host = typeof xClient === 'string' ? xClient.trim() : '';
  if (!host) return undefined;
  if (/^https?:\/\//i.test(host)) return host.replace(/\/$/, '');
  const proto =
    (req.headers['x-forwarded-proto'] as string) ||
    (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/$/, '');
}

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
    @Req() req: Request,
  ): Promise<CheckoutSessionResponseDto> {
    const frontendOrigin =
      dto.frontendOrigin?.trim() || resolveFrontendOriginFromRequest(req);
    return this.paymentsService.createCheckoutSession(
      dto.orderId,
      restaurantId,
      dto.returnTo,
      frontendOrigin,
    );
  }

  @Get('order/:orderId/vietqr')
  @ApiOperation({ summary: 'Get SePay VietQR image URL for bank transfer' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, type: VietQrPaymentResponseDto })
  async getVietQr(
    @Param('orderId') orderId: string,
    @RestaurantId() restaurantId: string,
  ): Promise<VietQrPaymentResponseDto> {
    return this.paymentsService.getVietQrPayment(orderId, restaurantId);
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

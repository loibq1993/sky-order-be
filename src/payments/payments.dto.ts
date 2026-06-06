import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Order ID to pay' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Relative path to return after Stripe redirect (e.g. /admin?section=orders)',
    example: '/admin?section=orders',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/(?!\/).*$/, {
    message: 'returnTo must be a relative path starting with /',
  })
  returnTo?: string;

  @ApiPropertyOptional({
    description: 'Storefront origin (e.g. http://demo.localhost:3000) for Stripe success/cancel URLs',
    example: 'http://demo.localhost:3000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^https?:\/\/[^/]+$/i, {
    message: 'frontendOrigin must be an origin URL without path (e.g. http://demo.localhost:3000)',
  })
  frontendOrigin?: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({ example: 'cs_test_...' })
  sessionId: string;

  @ApiProperty({ example: 'https://checkout.stripe.com/...' })
  url: string;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId: string;

  @ApiProperty({ example: 'paid', enum: ['unpaid', 'processing', 'paid', 'failed'] })
  paymentStatus: string;

  @ApiPropertyOptional({ example: 'stripe' })
  paymentMethod?: string;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiPropertyOptional({
    description:
      'True when Stripe Checkout session is paid (read-only). DB may still be processing until webhook runs.',
  })
  checkoutPaidOnStripe?: boolean;
}

export class VietQrPaymentResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty({ example: 'CF_1780702964927-011' })
  orderNumber: string;

  @ApiProperty({ example: 150000 })
  amount: number;

  @ApiProperty({ description: 'Transfer description — must match bank transfer content' })
  transferContent: string;

  @ApiProperty({ example: 'https://qr.sepay.vn/img?acc=...' })
  qrImageUrl: string;

  @ApiProperty({ example: 'unpaid' })
  paymentStatus: string;
}

export class CreateSepayPgCheckoutDto {
  @ApiProperty({ description: 'Order ID to pay' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Storefront origin for SePay return URLs',
    example: 'http://demo.localhost:3000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^https?:\/\/[^/]+$/i, {
    message: 'frontendOrigin must be an origin URL without path',
  })
  frontendOrigin?: string;

  @ApiPropertyOptional({ enum: ['BANK_TRANSFER', 'NAPAS_BANK_TRANSFER'] })
  @IsOptional()
  @IsString()
  paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';
}

export class SepayPgCheckoutResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty({ example: 'https://pay.sepay.vn/v1/checkout/init' })
  checkoutUrl: string;

  @ApiProperty({ description: 'Hidden form fields including signature' })
  formFields: Record<string, string | number>;
}

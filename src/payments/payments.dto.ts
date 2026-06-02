import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Order ID to pay' })
  @IsUUID()
  orderId: string;
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
}

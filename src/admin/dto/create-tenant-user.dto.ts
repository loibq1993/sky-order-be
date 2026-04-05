import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';

/** Tạo user trong tenant — `restaurantId` lấy từ JWT / query (super admin), không gửi trong body. */
export class CreateTenantUserDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    enum: [
      'restaurant_manager',
      'restaurant_staff',
      'staff_reception',
      'staff_kitchen',
      'staff_waiter',
      'customer',
    ],
  })
  @IsOptional()
  @IsEnum([
    'restaurant_manager',
    'restaurant_staff',
    'staff_reception',
    'staff_kitchen',
    'staff_waiter',
    'customer',
  ])
  role?: string;
}

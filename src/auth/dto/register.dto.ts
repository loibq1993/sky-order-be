import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID, IsEnum, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    description: 'User role',
    enum: ['super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff', 'customer'],
    required: false 
  })
  @IsOptional()
  @IsEnum(['super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff', 'customer'])
  role?: string;

  @ApiProperty({ description: 'Restaurant ID', required: false })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

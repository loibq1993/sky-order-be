import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsObject } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ description: 'Restaurant name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Restaurant name in Korean', required: false })
  @IsOptional()
  @IsString()
  nameKo?: string;

  @ApiProperty({ description: 'Restaurant description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Restaurant description in Korean', required: false })
  @IsOptional()
  @IsString()
  descriptionKo?: string;

  @ApiProperty({ description: 'Restaurant logo URL', required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ description: 'Restaurant address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Restaurant phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Restaurant email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Restaurant website', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: 'Restaurant timezone', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Restaurant currency', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Restaurant language', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Restaurant settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: any;
}

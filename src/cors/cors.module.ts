import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { CorsAllowedOriginsService } from './cors-allowed-origins.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [CorsAllowedOriginsService],
  exports: [CorsAllowedOriginsService],
})
export class CorsModule {}

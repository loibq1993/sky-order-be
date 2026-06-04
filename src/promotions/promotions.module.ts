import { Module } from '@nestjs/common';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsService } from './promotions.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}

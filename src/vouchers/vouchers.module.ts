import { Module } from '@nestjs/common';
import { AdminVouchersController } from './admin-vouchers.controller';
import { ClientVouchersController } from './client-vouchers.controller';
import { VouchersService } from './vouchers.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AdminVouchersController, ClientVouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}

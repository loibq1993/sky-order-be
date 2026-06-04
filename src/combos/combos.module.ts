import { Module } from '@nestjs/common';
import { AdminCombosController } from './admin-combos.controller';
import { ClientCombosController } from './client-combos.controller';
import { CombosService } from './combos.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AdminCombosController, ClientCombosController],
  providers: [CombosService],
  exports: [CombosService],
})
export class CombosModule {}

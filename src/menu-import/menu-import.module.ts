import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { UploadModule } from '../upload/upload.module';
import { MenuImportService } from './menu-import.service';
import { MenuImportController } from './menu-import.controller';

@Module({
  imports: [TenantModule, UploadModule],
  controllers: [MenuImportController],
  providers: [MenuImportService],
})
export class MenuImportModule {}

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../entities/tenant.entity';
import { PlatformUser } from '../entities/platform-user.entity';
import { Notification } from '../entities/notification.entity';
import {
  TenantUser,
  TenantCategory,
  TenantProduct,
  TenantProductCategory,
  TenantTable,
  TenantOrder,
  TenantOrderItem,
} from '../entities/tenant';
import { join } from 'path';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('app.database.host'),
    port: configService.get<number>('app.database.port'),
    username: configService.get<string>('app.database.username'),
    password: configService.get<string>('app.database.password'),
    database: configService.get<string>('app.database.database'),
    entities: [
      Tenant,
      PlatformUser,
      Notification,
      TenantUser,
      TenantCategory,
      TenantProduct,
      TenantProductCategory,
      TenantTable,
      TenantOrder,
      TenantOrderItem,
    ],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    synchronize: false,
}); 
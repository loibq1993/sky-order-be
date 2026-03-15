import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { TenantTable } from '../entities/tenant/tenant-table.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { QrCodeService } from './qr-code.service';
import {
  CreateTableDto,
  UpdateTableDto,
  TableResponseDto,
  GenerateQrCodesDto,
  TableStatus,
} from './tables.dto';

@Injectable()
export class TablesService {
  private readonly qrCodeDir = path.join(process.cwd(), 'public', 'upload', 'qr-codes');

  constructor(
    private tenantSchemaService: TenantSchemaService,
    private qrCodeService: QrCodeService,
  ) {}

  async create(createTableDto: CreateTableDto, restaurantId?: string): Promise<TableResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId (tenant) is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const existing = await repo.findOne({
        where: { tableNumber: createTableDto.tableNumber, deletedAt: IsNull() },
      });
      if (existing) {
        throw new BadRequestException(`Table number ${createTableDto.tableNumber} already exists`);
      }
      const table = repo.create({
        ...createTableDto,
        status: (createTableDto.status as string) || TableStatus.AVAILABLE,
        capacity: createTableDto.capacity || 4,
      });
      const saved = await repo.save(table);
      return this.mapToResponseDto(saved);
    });
  }

  async findAll(restaurantId?: string): Promise<TableResponseDto[]> {
    if (!restaurantId) return [];
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const tables = await repo.find({
        where: { deletedAt: IsNull() },
        order: { tableNumber: 'ASC' },
      });
      return tables.map((t) => this.mapToResponseDto(t));
    });
  }

  async findOne(id: string, restaurantId?: string): Promise<TableResponseDto> {
    if (!restaurantId) throw new NotFoundException('Table not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!table) throw new NotFoundException(`Table with ID ${id} not found`);
      return this.mapToResponseDto(table);
    });
  }

  async findByTableNumber(tableNumber: number, restaurantId?: string): Promise<TableResponseDto> {
    if (!restaurantId) throw new NotFoundException('Table not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({
        where: { tableNumber, deletedAt: IsNull() },
      });
      if (!table) throw new NotFoundException(`Table number ${tableNumber} not found`);
      return this.mapToResponseDto(table);
    });
  }

  async findByQrUuid(qrUuid: string, restaurantId?: string): Promise<TableResponseDto> {
    if (!restaurantId) throw new NotFoundException('Table not found');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({
        where: { qrUuid, deletedAt: IsNull() },
      });
      if (!table) throw new NotFoundException('Table not found');
      return this.mapToResponseDto(table);
    });
  }

  async update(
    id: string,
    updateTableDto: UpdateTableDto,
    restaurantId?: string,
  ): Promise<TableResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!table) throw new NotFoundException(`Table with ID ${id} not found`);
      if (
        updateTableDto.tableNumber != null &&
        updateTableDto.tableNumber !== table.tableNumber
      ) {
        const existing = await repo.findOne({
          where: { tableNumber: updateTableDto.tableNumber, deletedAt: IsNull() },
        });
        if (existing) {
          throw new BadRequestException(`Table number ${updateTableDto.tableNumber} already exists`);
        }
      }
      Object.assign(table, updateTableDto);
      const saved = await repo.save(table);
      return this.mapToResponseDto(saved);
    });
  }

  async remove(id: string, restaurantId?: string): Promise<{ message: string }> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!table) throw new NotFoundException(`Table with ID ${id} not found`);
      await repo.softDelete(id);
      return { message: 'Table deleted successfully' };
    });
  }

  async generateQrCodes(
    generateQrCodesDto: GenerateQrCodesDto,
    restaurantId?: string,
  ): Promise<{ message: string; tables: TableResponseDto[] }> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    const { baseUrl, restaurantName, count, capacity: capacityInput } = generateQrCodesDto;
    const capacity = capacityInput ?? 4;
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const existing = await repo.find({ withDeleted: true });
      const created: TableResponseDto[] = [];

      for (let i = 1; i <= count; i++) {
        const tableByNumber = existing.find((t) => t.tableNumber === i);
        if (tableByNumber) {
          if (tableByNumber.qrUuid && fs.existsSync(path.join(this.qrCodeDir, `qr-${tableByNumber.qrUuid}.png`))) {
            fs.unlinkSync(path.join(this.qrCodeDir, `qr-${tableByNumber.qrUuid}.png`));
          }
          const qrResult = await this.qrCodeService.generateQrCodeForTable(
            i,
            baseUrl,
            restaurantName,
            restaurantId,
          );
          tableByNumber.name = `Bàn ${i}`;
          tableByNumber.qrCodeUrl = qrResult.qrCodeUrl;
          tableByNumber.qrCodeImagePath = qrResult.qrCodeImagePath;
          tableByNumber.orderUrl = qrResult.orderUrl;
          tableByNumber.qrUuid = qrResult.qrUuid;
          tableByNumber.status = 'available';
          tableByNumber.capacity = 4;
          tableByNumber.isActive = true;
          if (tableByNumber.deletedAt) {
            await repo.recover(tableByNumber);
          }
          const saved = await repo.save(tableByNumber);
          created.push(this.mapToResponseDto(saved));
        } else {
          const qrResult = await this.qrCodeService.generateQrCodeForTable(
            i,
            baseUrl,
            restaurantName,
            restaurantId,
          );
          const table = repo.create({
            name: `Bàn ${i}`,
            tableNumber: i,
            qrCodeUrl: qrResult.qrCodeUrl,
            qrCodeImagePath: qrResult.qrCodeImagePath,
            orderUrl: qrResult.orderUrl,
            qrUuid: qrResult.qrUuid,
            status: 'available',
            capacity,
            isActive: true,
          });
          const saved = await repo.save(table);
          created.push(this.mapToResponseDto(saved));
        }
      }

      for (const t of existing) {
        if (t.tableNumber > count) {
          if (t.qrUuid && fs.existsSync(path.join(this.qrCodeDir, `qr-${t.qrUuid}.png`))) {
            try {
              fs.unlinkSync(path.join(this.qrCodeDir, `qr-${t.qrUuid}.png`));
            } catch {
              // ignore
            }
          }
          await repo.softDelete(t.id);
        }
      }

      return {
        message: `Generated ${count} QR codes successfully`,
        tables: created,
      };
    });
  }

  async generateQrCodeForTable(
    tableNumber: number,
    baseUrl: string,
    restaurantName: string,
    restaurantId?: string,
  ): Promise<TableResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({
        where: { tableNumber, deletedAt: IsNull() },
      });
      if (!table) throw new NotFoundException(`Table number ${tableNumber} not found`);
      const qrResult = await this.qrCodeService.generateQrCodeForTable(
        tableNumber,
        baseUrl,
        restaurantName,
        restaurantId,
      );
      table.qrCodeUrl = qrResult.qrCodeUrl;
      table.qrCodeImagePath = qrResult.qrCodeImagePath;
      table.orderUrl = qrResult.orderUrl;
      table.qrUuid = qrResult.qrUuid;
      const saved = await repo.save(table);
      return this.mapToResponseDto(saved);
    });
  }

  async updateTableStatus(id: string, status: TableStatus, restaurantId?: string): Promise<TableResponseDto> {
    if (!restaurantId) throw new BadRequestException('restaurantId is required');
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantTable);
      const table = await repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!table) throw new NotFoundException(`Table with ID ${id} not found`);
      table.status = status as string;
      const saved = await repo.save(table);
      return this.mapToResponseDto(saved);
    });
  }

  /** Normalize URL to avoid double slashes (e.g. http://host//api -> http://host/api) */
  private normalizeQrCodeUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    return url.replace(/([^:])\/\//g, '$1/');
  }

  private mapToResponseDto(table: TenantTable): TableResponseDto {
    return {
      id: table.id,
      name: table.name,
      tableNumber: table.tableNumber,
      qrCodeUrl: this.normalizeQrCodeUrl(table.qrCodeUrl) ?? undefined,
      qrCodeImagePath: table.qrCodeImagePath ?? undefined,
      orderUrl: table.orderUrl ?? undefined,
      qrUuid: table.qrUuid ?? undefined,
      status: table.status as TableStatus,
      capacity: table.capacity,
      description: table.description ?? undefined,
      isActive: table.isActive,
      createdAt: table.createdAt ? (table.createdAt as Date).toISOString() : undefined,
      updatedAt: table.updatedAt ? (table.updatedAt as Date).toISOString() : undefined,
    };
  }
}

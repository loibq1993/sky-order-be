import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Table } from '../entities/table.entity';
import { CreateTableDto, UpdateTableDto, TableResponseDto, GenerateQrCodesDto, TableStatus } from './tables.dto';
import { QrCodeService } from './qr-code.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class TablesService {
    constructor(
        @InjectRepository(Table)
        private tableRepository: Repository<Table>,
        private qrCodeService: QrCodeService,
    ) { }

    async create(createTableDto: CreateTableDto, restaurantId?: string): Promise<TableResponseDto> {
        // Check if table number already exists for this restaurant
        const existingTable = await this.tableRepository.findOne({
            where: {
                tableNumber: createTableDto.tableNumber,
                deletedAt: IsNull(),
                ...(restaurantId ? { restaurantId } : {})
            }
        });

        if (existingTable) {
            throw new BadRequestException(`Table number ${createTableDto.tableNumber} already exists`);
        }

        const table = this.tableRepository.create({
            ...createTableDto,
            ...(restaurantId ? { restaurantId } : {}),
            status: createTableDto.status || TableStatus.AVAILABLE,
            capacity: createTableDto.capacity || 4
        });

        const savedTable = await this.tableRepository.save(table);
        return this.mapToResponseDto(savedTable);
    }

    async findAll(): Promise<TableResponseDto[]> {
        const tables = await this.tableRepository.find({
            where: { deletedAt: IsNull() },
            order: { tableNumber: 'ASC' }
        });

        return tables.map(table => this.mapToResponseDto(table));
    }

    async findOne(id: string): Promise<TableResponseDto> {
        const table = await this.tableRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }

        return this.mapToResponseDto(table);
    }

    async findByTableNumber(tableNumber: number, restaurantId?: string): Promise<TableResponseDto> {
        const table = await this.tableRepository.findOne({
            where: {
                tableNumber,
                deletedAt: IsNull(),
                ...(restaurantId ? { restaurantId } : {})
            }
        });

        if (!table) {
            throw new NotFoundException(`Table number ${tableNumber} not found`);
        }

        return this.mapToResponseDto(table);
    }

    async update(id: string, updateTableDto: UpdateTableDto, restaurantId?: string): Promise<TableResponseDto> {
        const table = await this.tableRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }

        // Check if new table number conflicts with existing table
        if (updateTableDto.tableNumber && updateTableDto.tableNumber !== table.tableNumber) {
            const existingTable = await this.tableRepository.findOne({
                where: {
                    tableNumber: updateTableDto.tableNumber,
                    deletedAt: IsNull(),
                    ...(restaurantId ? { restaurantId } : {})
                }
            });

            if (existingTable) {
                throw new BadRequestException(`Table number ${updateTableDto.tableNumber} already exists`);
            }
        }

        Object.assign(table, updateTableDto);
        const updatedTable = await this.tableRepository.save(table);

        return this.mapToResponseDto(updatedTable);
    }

    async remove(id: string): Promise<{ message: string }> {
        const table = await this.tableRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }

        await this.tableRepository.softDelete(id);
        return { message: 'Table deleted successfully' };
    }

    async generateQrCodes(generateQrCodesDto: GenerateQrCodesDto, restaurantId?: string): Promise<{
        message: string;
        tables: TableResponseDto[];
    }> {
        const { baseUrl, restaurantName, count } = generateQrCodesDto;

        // Clear existing QR codes and table records
        await this.clearExistingQrCodes(restaurantId);

        // Generate QR codes for multiple tables
        const qrCodeResults = await this.qrCodeService.generateMultipleQrCodes(
            count,
            baseUrl,
            restaurantName,
            restaurantId
        );

        const createdTables: Table[] = [];

        for (const qrResult of qrCodeResults) {
            // Create new table (since we cleared existing ones)
            const table = this.tableRepository.create({
                name: `Bàn ${qrResult.tableNumber}`,
                tableNumber: qrResult.tableNumber,
                qrCodeUrl: qrResult.qrCodeUrl,
                qrCodeImagePath: qrResult.qrCodeImagePath,
                orderUrl: qrResult.orderUrl,
                qrUuid: qrResult.qrUuid,
                ...(restaurantId ? { restaurantId } : {}),
                status: TableStatus.AVAILABLE,
                capacity: 4,
                isActive: true
            });

            const savedTable = await this.tableRepository.save(table);
            createdTables.push(savedTable);
        }

        return {
            message: `Generated ${count} QR codes successfully and cleared existing QR codes`,
            tables: createdTables.map(table => this.mapToResponseDto(table))
        };
    }

    async generateQrCodeForTable(
        tableNumber: number,
        baseUrl: string,
        restaurantName: string,
        restaurantId?: string
    ): Promise<TableResponseDto> {
        const table = await this.tableRepository.findOne({
            where: {
                tableNumber,
                deletedAt: IsNull(),
                ...(restaurantId ? { restaurantId } : {})
            }
        });

        if (!table) {
            throw new NotFoundException(`Table number ${tableNumber} not found`);
        }

        // Generate QR code for this table
        const qrResult = await this.qrCodeService.generateQrCodeForTable(
            tableNumber,
            baseUrl,
            restaurantName,
            restaurantId
        );

        // Update table with QR code info
        table.qrCodeUrl = qrResult.qrCodeUrl;
        table.qrCodeImagePath = qrResult.qrCodeImagePath;
        table.orderUrl = qrResult.orderUrl;
        table.qrUuid = qrResult.qrUuid;

        const updatedTable = await this.tableRepository.save(table);
        return this.mapToResponseDto(updatedTable);
    }

    async updateTableStatus(id: string, status: TableStatus): Promise<TableResponseDto> {
        const table = await this.tableRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });

        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }

        table.status = status;
        const updatedTable = await this.tableRepository.save(table);

        return this.mapToResponseDto(updatedTable);
    }

    private async clearExistingQrCodes(restaurantId?: string): Promise<void> {
        if (restaurantId) {
            const tables = await this.tableRepository.find({
                where: { restaurantId },
                withDeleted: true,
            });

            const qrCodeDir = path.join(process.cwd(), 'public', 'upload', 'qr-codes');
            for (const table of tables) {
                if (!table.qrUuid) continue;
                const filePath = path.join(qrCodeDir, `qr-${table.qrUuid}.png`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await this.tableRepository.createQueryBuilder()
                .delete()
                .from('tables')
                .where('restaurantId = :restaurantId', { restaurantId })
                .execute();
            return;
        }

        // Delete existing QR code image files
        const qrCodeDir = path.join(process.cwd(), 'public', 'upload', 'qr-codes');
        if (fs.existsSync(qrCodeDir)) {
            const files = fs.readdirSync(qrCodeDir);
            for (const file of files) {
                if (file.startsWith('qr-') && file.endsWith('.png')) {
                    fs.unlinkSync(path.join(qrCodeDir, file));
                }
            }
        }

        // Hard delete all existing table records (including soft-deleted ones)
        await this.tableRepository.createQueryBuilder()
            .delete()
            .from('tables')
            .execute();
    }

    private mapToResponseDto(table: Table): TableResponseDto {
        return {
            id: table.id,
            name: table.name,
            tableNumber: table.tableNumber,
            qrCodeUrl: table.qrCodeUrl || undefined,
            qrCodeImagePath: table.qrCodeImagePath || undefined,
            orderUrl: table.orderUrl || undefined,
            qrUuid: table.qrUuid || undefined,
            status: table.status as TableStatus,
            capacity: table.capacity,
            description: table.description || undefined,
            isActive: table.isActive,
            createdAt: table.createdAt ? table.createdAt.toISOString() : undefined,
            updatedAt: table.updatedAt ? table.updatedAt.toISOString() : undefined,
        };
    }
} 
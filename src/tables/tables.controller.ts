import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    Res
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { CreateTableDto, UpdateTableDto, TableResponseDto, GenerateQrCodesDto, TableStatus } from './tables.dto';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('tables')
@Controller('admin/tables')
export class TablesController {
    constructor(private readonly tablesService: TablesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new table' })
    @ApiBody({ type: CreateTableDto })
    @ApiResponse({ status: 201, description: 'Table created successfully', type: TableResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(
        @Body() createTableDto: CreateTableDto,
        @RestaurantId() restaurantId?: string
    ): Promise<TableResponseDto> {
        return this.tablesService.create(createTableDto, restaurantId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tables' })
    @ApiResponse({ status: 200, description: 'Tables retrieved successfully', type: [TableResponseDto] })
    async findAll(): Promise<TableResponseDto[]> {
        return this.tablesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get table by ID' })
    @ApiParam({ name: 'id', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Table found', type: TableResponseDto })
    @ApiResponse({ status: 404, description: 'Table not found' })
    async findOne(@Param('id') id: string): Promise<TableResponseDto> {
        return this.tablesService.findOne(id);
    }

    @Get('number/:tableNumber')
    @ApiOperation({ summary: 'Get table by table number' })
    @ApiParam({ name: 'tableNumber', description: 'Table number' })
    @ApiResponse({ status: 200, description: 'Table found', type: TableResponseDto })
    @ApiResponse({ status: 404, description: 'Table not found' })
    async findByTableNumber(
        @Param('tableNumber') tableNumber: string,
        @RestaurantId() restaurantId?: string
    ): Promise<TableResponseDto> {
        return this.tablesService.findByTableNumber(parseInt(tableNumber, 10), restaurantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update table' })
    @ApiParam({ name: 'id', description: 'Table ID' })
    @ApiBody({ type: UpdateTableDto })
    @ApiResponse({ status: 200, description: 'Table updated successfully', type: TableResponseDto })
    @ApiResponse({ status: 404, description: 'Table not found' })
    async update(
        @Param('id') id: string,
        @Body() updateTableDto: UpdateTableDto,
        @RestaurantId() restaurantId?: string
    ): Promise<TableResponseDto> {
        return this.tablesService.update(id, updateTableDto, restaurantId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete table' })
    @ApiParam({ name: 'id', description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Table deleted successfully' })
    @ApiResponse({ status: 404, description: 'Table not found' })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
        return this.tablesService.remove(id);
    }

    @Post('generate-qr-codes')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate QR codes for multiple tables' })
    @ApiBody({ type: GenerateQrCodesDto })
    @ApiResponse({ status: 200, description: 'QR codes generated successfully' })
    async generateQrCodes(
        @Body() generateQrCodesDto: GenerateQrCodesDto,
        @RestaurantId() restaurantId?: string
    ): Promise<{
        message: string;
        tables: TableResponseDto[];
    }> {
        return this.tablesService.generateQrCodes(generateQrCodesDto, restaurantId);
    }

    @Post(':tableNumber/generate-qr')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate QR code for specific table' })
    @ApiParam({ name: 'tableNumber', description: 'Table number' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                baseUrl: {
                    type: 'string',
                    example: 'http://localhost:3000/'
                },
                restaurantName: {
                    type: 'string',
                    example: 'Việt Phố'
                }
            },
            required: ['baseUrl', 'restaurantName']
        }
    })
    @ApiResponse({ status: 200, description: 'QR code generated successfully', type: TableResponseDto })
    async generateQrCodeForTable(
        @Param('tableNumber') tableNumber: string,
        @Body() body: { baseUrl: string; restaurantName: string },
        @RestaurantId() restaurantId?: string
    ): Promise<TableResponseDto> {
        return this.tablesService.generateQrCodeForTable(
            parseInt(tableNumber, 10),
            body.baseUrl,
            body.restaurantName,
            restaurantId
        );
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update table status' })
    @ApiParam({ name: 'id', description: 'Table ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['available', 'occupied', 'reserved', 'maintenance'],
                    example: 'occupied'
                }
            },
            required: ['status']
        }
    })
    @ApiResponse({ status: 200, description: 'Table status updated successfully', type: TableResponseDto })
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: TableStatus }
    ): Promise<TableResponseDto> {
        return this.tablesService.updateTableStatus(id, body.status);
    }

    @Get('qr/:tableNumber')
    @ApiOperation({ summary: 'Serve QR code image by table number (admin)' })
    @ApiParam({ name: 'tableNumber', description: 'Table number' })
    @ApiResponse({ status: 200, description: 'QR code image' })
    @ApiResponse({ status: 404, description: 'QR code not found' })
    async serveQrCode(@Param('tableNumber') tableNumber: string, @Res() res: Response) {
        // Find table by table number to get the qrUuid
        const table = await this.tablesService.findByTableNumber(parseInt(tableNumber, 10));

        if (!table.qrUuid) {
            return res.status(404).json({
                message: 'QR code not found',
                error: 'Not Found',
                statusCode: 404
            });
        }

        const imagePath = path.join(process.cwd(), 'public', 'upload', 'qr-codes', `qr-${table.qrUuid}.png`);

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                message: 'QR code not found',
                error: 'Not Found',
                statusCode: 404
            });
        }

        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    }
} 
import {
    Controller,
    Get,
    Param,
    Res,
    Query,
    UseInterceptors,
    ClassSerializerInterceptor,
    NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam
} from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { TablesService } from './tables.service';
import { OrdersService } from '../orders/orders.service';

@ApiTags('public-tables')
@Controller('tables')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicTablesController {
    constructor(
        private readonly tablesService: TablesService,
        private readonly ordersService: OrdersService
    ) { }

    @Get('qr/:tableNumber')
    @ApiOperation({ summary: 'Serve QR code image by table number (public)' })
    @ApiParam({ name: 'tableNumber', description: 'Table number' })
    @ApiResponse({ status: 200, description: 'QR code image' })
    @ApiResponse({ status: 404, description: 'QR code not found' })
    async serveQrCode(
        @Param('tableNumber') tableNumber: string,
        @Query('restaurantId') restaurantId: string | undefined,
        @Res() res: Response
    ) {
        // Find table by table number to get the qrUuid
        const table = await this.tablesService.findByTableNumber(parseInt(tableNumber, 10), restaurantId);

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

    @Get(':tableNumber/order')
    @ApiOperation({ summary: 'Get current active order for table (public)' })
    @ApiParam({ name: 'tableNumber', description: 'Table number' })
    @ApiResponse({ status: 200, description: 'Active order found' })
    @ApiResponse({ status: 404, description: 'No active order found' })
    async getTableOrder(
        @Param('tableNumber') tableNumber: string,
        @Query('restaurantId') restaurantId: string | undefined
    ) {
        const table = await this.tablesService.findByTableNumber(parseInt(tableNumber, 10), restaurantId);

        if (!table.id) {
            throw new NotFoundException(`Table number ${tableNumber} not found`);
        }

        // Get active order for this table
        const activeOrder = await this.ordersService.getActiveOrderByTable(table.id);

        if (!activeOrder) {
            return {
                status: 404,
                message: 'No active order found for this table'
            };
        }

        return activeOrder
    }
} 
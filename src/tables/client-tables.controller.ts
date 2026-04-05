import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { TableResponseDto } from './tables.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OrdersService } from '../orders/orders.service';
import { OrderResponseDto } from '../orders/orders.dto';

@ApiTags('tables-client')
@Controller('client/tables')
@UseGuards(OptionalJwtAuthGuard)
export class ClientTablesController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('number/:tableNumber/unpaid')
  @ApiOperation({ summary: 'Get unpaid orders for table by table number (Client)' })
  @ApiParam({ name: 'tableNumber', description: 'Table number' })
  @ApiResponse({ status: 200, description: 'List of unpaid orders for the table' })
  async getUnpaidOrdersByTableNumber(
    @Param('tableNumber') tableNumber: string,
    @RestaurantId() restaurantId: string,
  ): Promise<OrderResponseDto[]> {
    const table = await this.tablesService.findByTableNumber(parseInt(tableNumber, 10), restaurantId);
    if (!table?.id) throw new NotFoundException('Table not found');
    return this.ordersService.getUnpaidOrdersByTable(table.id, restaurantId);
  }

  @Get('number/:tableNumber')
  @ApiOperation({ summary: 'Get table by table number (Client)' })
  @ApiParam({ name: 'tableNumber', description: 'Table number' })
  @ApiResponse({ status: 200, description: 'Table found', type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async findByTableNumber(
    @Param('tableNumber') tableNumber: string,
    @RestaurantId() restaurantId: string,
  ): Promise<TableResponseDto> {
    return this.tablesService.findByTableNumber(parseInt(tableNumber, 10), restaurantId);
  }

  @Get('qr/:qrUuid')
  @ApiOperation({ summary: 'Get table by QR UUID (Client)' })
  @ApiParam({ name: 'qrUuid', description: 'QR code UUID' })
  @ApiResponse({ status: 200, description: 'Table found', type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async findByQrUuid(
    @Param('qrUuid') qrUuid: string,
    @RestaurantId() restaurantId: string,
  ): Promise<TableResponseDto> {
    return this.tablesService.findByQrUuid(qrUuid, restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table by ID (Client)' })
  @ApiParam({ name: 'id', description: 'Table ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Table found', type: TableResponseDto })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async findOne(
    @Param('id') id: string,
    @RestaurantId() restaurantId: string,
  ): Promise<TableResponseDto> {
    return this.tablesService.findOne(id, restaurantId);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Order, OrderItem } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Table } from '../entities/table.entity';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto, OrderItemResponseDto, OrderType, OrderStatus } from './orders.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Table)
        private tableRepository: Repository<Table>,
    ) { }

    private generateOrderNumber(): string {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD-${timestamp}-${random}`;
    }

    async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
        const orderNumber = this.generateOrderNumber();

        // Validate table if provided
        let table: Table | null = null;
        if (createOrderDto.tableId || createOrderDto.tableNumber) {
            if (createOrderDto.tableId) {
                table = await this.tableRepository.findOne({
                    where: { id: createOrderDto.tableId, deletedAt: IsNull() }
                });
                if (!table) {
                    throw new BadRequestException(`Table with ID ${createOrderDto.tableId} not found`);
                }
            } else if (createOrderDto.tableNumber) {
                table = await this.tableRepository.findOne({
                    where: { tableNumber: createOrderDto.tableNumber, deletedAt: IsNull() }
                });
                if (!table) {
                    throw new BadRequestException(`Table number ${createOrderDto.tableNumber} not found`);
                }
            }

            // Check if there's an active order for this table
            if (table) {
                const activeOrder = await this.orderRepository.findOne({
                    where: {
                        tableId: table.id,
                        status: OrderStatus.PENDING || OrderStatus.CONFIRMED || OrderStatus.PREPARING || OrderStatus.READY || OrderStatus.SERVED,
                        deletedAt: IsNull()
                    }
                });

                if (activeOrder) {
                    throw new BadRequestException(`Table ${table.tableNumber} already has an active order (Order #${activeOrder.orderNumber}). Please add items to the existing order or complete it first.`);
                }
            }
        }

        // Validate products exist and calculate totals
        let totalAmount = 0;
        const orderItems: any[] = [];

        for (const item of createOrderDto.items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId, deletedAt: IsNull(), available: true, visible: true }
            });

            if (!product) {
                throw new BadRequestException(`Product with ID ${item.productId} not found or unavailable`);
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: product.price,
                totalPrice: itemTotal,
                specialInstructions: item.notes
            });
        }

        // Create the order
        const order = new Order();
        order.id = uuidv4();
        order.orderNumber = orderNumber;
        order.status = OrderStatus.PENDING;
        order.orderType = createOrderDto.orderType;
        order.tableId = table?.id || null;
        order.tableNumber = table?.tableNumber || null;
        order.customerName = createOrderDto.customerName || '';
        order.customerPhone = createOrderDto.customerPhone || null;
        order.customerAddress = createOrderDto.customerAddress || null;
        order.notes = createOrderDto.notes || null;
        order.subtotal = totalAmount;
        order.tax = 0;
        order.deliveryFee = 0;
        order.total = totalAmount;

        const savedOrder = await this.orderRepository.save(order);

        // Create order items
        const savedOrderItems: OrderItem[] = [];
        for (const item of orderItems) {
            const orderItem = new OrderItem();
            orderItem.id = uuidv4();
            orderItem.orderId = savedOrder.id;
            orderItem.productId = item.productId;
            orderItem.productName = item.productName;
            orderItem.quantity = item.quantity;
            orderItem.unitPrice = item.unitPrice;
            orderItem.totalPrice = item.totalPrice;
            orderItem.specialInstructions = item.specialInstructions || null;

            const savedItem = await this.orderItemRepository.save(orderItem);
            savedOrderItems.push(savedItem);
        }

        return this.findOne(savedOrder.id);
    }

    async findAll(): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async findOne(id: string): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['orderItems'],
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        return this.mapToResponseDto(order);
    }

    async findByOrderNumber(orderNumber: string): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { orderNumber },
            relations: ['orderItems'],
        });

        if (!order) {
            throw new NotFoundException(`Order with number ${orderNumber} not found`);
        }

        return this.mapToResponseDto(order);
    }

    async updateOrder(id: string, updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { id }
        });
        console.log(order)
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        // Handle additional items if provided
        if (updateOrderDto.additionalItems && updateOrderDto.additionalItems.length > 0) {
            let additionalTotal = 0;

            // Check if order status allows updates (not cancelled, completed, or delivered)
            if (order.status === OrderStatus.CANCELLED ||
                order.status === OrderStatus.COMPLETED ||
                order.status === OrderStatus.DELIVERED) {
                throw new BadRequestException(`Cannot add items to order with status: ${order.status}`);
            }

            for (const item of updateOrderDto.additionalItems) {
                const product = await this.productRepository.findOne({
                    where: { id: item.productId, deletedAt: IsNull(), available: true, visible: true }
                });

                if (!product) {
                    throw new BadRequestException(`Product with ID ${item.productId} not found or unavailable`);
                }

                const itemTotal = product.price * item.quantity;
                additionalTotal += itemTotal;
                // Create new order item
                const orderItem = new OrderItem();
                orderItem.id = uuidv4();
                orderItem.orderId = id;
                orderItem.productId = item.productId;
                orderItem.productName = product.name;
                orderItem.quantity = item.quantity;
                orderItem.unitPrice = product.price;
                orderItem.totalPrice = itemTotal;
                orderItem.specialInstructions = item.notes || null;
                await this.orderItemRepository.save(orderItem);
            }

            // Update order totals
            order.subtotal += additionalTotal;
            order.total += additionalTotal;

            // Reset status to PENDING when new items are added (unless already pending)
            if (order.status !== OrderStatus.PENDING) {
                order.status = OrderStatus.PENDING;
            }
        }

        // Update other fields - only update specific fields to avoid issues with relations
        const updateData: any = {};

        if (updateOrderDto.status !== undefined) {
            updateData.status = updateOrderDto.status;
        }
        if (updateOrderDto.customerName !== undefined) {
            updateData.customerName = updateOrderDto.customerName;
        }
        if (updateOrderDto.customerPhone !== undefined) {
            updateData.customerPhone = updateOrderDto.customerPhone;
        }
        if (updateOrderDto.customerAddress !== undefined) {
            updateData.customerAddress = updateOrderDto.customerAddress;
        }
        if (updateOrderDto.notes !== undefined) {
            updateData.notes = updateOrderDto.notes;
        }
        if (updateOrderDto.estimatedDeliveryTime !== undefined) {
            updateData.estimatedDeliveryTime = updateOrderDto.estimatedDeliveryTime;
        }
        if (updateOrderDto.actualDeliveryTime !== undefined) {
            updateData.actualDeliveryTime = updateOrderDto.actualDeliveryTime;
        }

        // Update order totals and status if additional items were added
        if (updateOrderDto.additionalItems && updateOrderDto.additionalItems.length > 0) {
            updateData.subtotal = order.subtotal;
            updateData.total = order.total;
            updateData.status = order.status; // Include the status change
        }

        await this.orderRepository.update(id, updateData);

        // Recalculate total price based on all order items
        await this.recalculateOrderTotal(id);

        const updatedOrder = await this.orderRepository.findOne({ where: { id } });

        if (!updatedOrder) {
            throw new NotFoundException(`Order with ID ${id} not found after update`);
        }

        return this.findOne(updatedOrder.id);
    }

    async deleteOrder(id: string): Promise<void> {
        const order = await this.orderRepository.findOne({ where: { id } });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        // Delete order items first
        await this.orderItemRepository.delete({ orderId: id });

        // Delete the order
        await this.orderRepository.delete(id);
    }

    async softDeleteOrder(id: string): Promise<void> {
        const order = await this.orderRepository.findOne({ where: { id } });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        // Soft delete order items first
        await this.orderItemRepository.softDelete({ orderId: id });

        // Soft delete the order
        await this.orderRepository.softDelete(id);
    }

    async restoreOrder(id: string): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { id },
            withDeleted: true
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        // Restore order items first
        await this.orderItemRepository.restore({ orderId: id });

        // Restore the order
        await this.orderRepository.restore(id);

        return this.findOne(id);
    }

    async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({ where: { id } });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        order.status = status;
        await this.orderRepository.save(order);

        return this.findOne(id);
    }

    async findAllWithDeleted(): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            withDeleted: true,
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async findOneWithDeleted(id: string): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findOne({
            where: { id },
            withDeleted: true,
            relations: ['orderItems'],
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        return this.mapToResponseDto(order);
    }

    async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                } as any
            },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByCustomer(customerName: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: {
                customerName: {
                    $like: `%${customerName}%`
                } as any
            },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByCustomerPhone(customerPhone: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: {
                customerPhone: {
                    $like: `%${customerPhone}%`
                } as any
            },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByStatus(status: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { status: status as OrderStatus },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByMultipleStatuses(statuses: OrderStatus[]): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.orderItems', 'orderItems')
            .where('order.status IN (:...statuses)', { statuses })
            .orderBy('order.createdAt', 'DESC')
            .getMany();

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersExcludingStatuses(excludedStatuses: OrderStatus[]): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.orderItems', 'orderItems')
            .where('order.status NOT IN (:...excludedStatuses)', { excludedStatuses })
            .orderBy('order.createdAt', 'DESC')
            .getMany();

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getActiveOrdersCount(): Promise<number> {
        const count = await this.orderRepository
            .createQueryBuilder('order')
            .where('order.status NOT IN (:...excludedStatuses)', {
                excludedStatuses: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.DELIVERED]
            })
            .andWhere('order.deletedAt IS NULL')
            .getCount();

        return count;
    }

    async getOrdersCountByStatuses(statuses: OrderStatus[]): Promise<number> {
        const count = await this.orderRepository
            .createQueryBuilder('order')
            .where('order.status IN (:...statuses)', { statuses })
            .andWhere('order.deletedAt IS NULL')
            .getCount();

        return count;
    }

    async getPendingOrdersCount(): Promise<number> {
        return this.getOrdersCountByStatuses([OrderStatus.PENDING]);
    }

    async getOrdersByType(orderType: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { orderType: orderType as OrderType },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByTable(tableId: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { tableId },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getActiveOrderByTable(tableId: string): Promise<OrderResponseDto | null> {
        const order = await this.orderRepository.findOne({
            where: {
                tableId,
                status: In([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED]),
                deletedAt: IsNull()
            },
            relations: ['orderItems'],
        });

        return order ? this.mapToResponseDto(order) : null;
    }

    private async recalculateOrderTotal(orderId: string): Promise<void> {
        // Get all order items for this order
        const orderItems = await this.orderItemRepository.find({
            where: { orderId }
        });

        // Calculate total from all order items
        const subtotal = orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const tax = 0; // You can add tax calculation logic here if needed
        const deliveryFee = 0; // You can add delivery fee calculation logic here if needed
        const total = subtotal + tax + deliveryFee;

        // Update the order with recalculated totals
        await this.orderRepository.update(orderId, {
            subtotal,
            tax,
            deliveryFee,
            total
        });
    }

    private mapToResponseDto(order: Order): OrderResponseDto {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status as OrderStatus,
            orderType: order.orderType as OrderType,
            tableId: order.tableId || undefined,
            tableNumber: order.tableNumber || undefined,
            items: order.orderItems?.map(item => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.unitPrice,
                totalPrice: item.totalPrice,
                notes: item.specialInstructions || undefined,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            })) || [],
            totalAmount: order.total,
            customerName: order.customerName || undefined,
            customerPhone: order.customerPhone || undefined,
            customerAddress: order.customerAddress || undefined,
            notes: order.notes || undefined,
            specialInstructions: undefined,
            estimatedDeliveryTime: order.estimatedDeliveryTime || undefined,
            actualDeliveryTime: order.actualDeliveryTime || undefined,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };
    }

    // Get total number of orders
    async getTotalOrdersCount(): Promise<number> {
        return this.orderRepository.count({
            where: { deletedAt: IsNull() }
        });
    }

    // Get today's revenue
    async getTodayRevenue(): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total)', 'total')
            .where('order.deletedAt IS NULL')
            .andWhere('order.status NOT IN (:...excludedStatuses)', {
                excludedStatuses: [OrderStatus.CANCELLED]
            })
            .andWhere('order.createdAt >= :today', { today })
            .getRawOne();

        return result?.total || 0;
    }

    // Get recent orders
    async getRecentOrders(limit: number = 5): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { deletedAt: IsNull() },
            order: { createdAt: 'DESC' },
            take: limit
        });

        return orders.map(order => this.mapToResponseDto(order));
    }
} 
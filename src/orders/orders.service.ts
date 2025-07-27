import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Order, OrderItem } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
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
    ) { }

    private generateOrderNumber(): string {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD-${timestamp}-${random}`;
    }

    async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
        const orderNumber = this.generateOrderNumber();

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
        const order = await this.orderRepository.findOne({ where: { id } });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        Object.assign(order, updateOrderDto);
        const updatedOrder = await this.orderRepository.save(order);

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

    async getOrdersByStatus(status: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { status: status as OrderStatus },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    async getOrdersByType(orderType: string): Promise<OrderResponseDto[]> {
        const orders = await this.orderRepository.find({
            where: { orderType: orderType as OrderType },
            relations: ['orderItems'],
            order: { createdAt: 'DESC' },
        });

        return orders.map(order => this.mapToResponseDto(order));
    }

    private mapToResponseDto(order: Order): OrderResponseDto {
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status as OrderStatus,
            orderType: order.orderType as OrderType,
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
} 
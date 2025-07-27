import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    orderNumber: string;

    @Column({ type: 'varchar', length: 100 })
    customerName: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    customerPhone: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true })
    customerAddress: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    tax: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    deliveryFee: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @Column({ type: 'enum', enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'], default: 'pending' })
    status: string;

    @Column({ type: 'enum', enum: ['dine_in', 'takeaway', 'delivery'], default: 'dine_in' })
    orderType: string;

    @Column({ type: 'timestamp', nullable: true })
    estimatedDeliveryTime: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    actualDeliveryTime: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // Relations
    @OneToMany(() => OrderItem, orderItem => orderItem.order)
    orderItems: OrderItem[];
}

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'varchar', length: 200 })
    productName: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalPrice: number;

    @Column({ type: 'text', nullable: true })
    specialInstructions: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Order, order => order.orderItems)
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'productId' })
    product: Product;
} 
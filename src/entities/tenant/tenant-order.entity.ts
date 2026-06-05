import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantOrderItem } from './tenant-order-item.entity';
import { TenantTable } from './tenant-table.entity';

@Entity('orders')
export class TenantOrder {
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

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'dine_in' })
  orderType: string;

  @Column({ type: 'uuid', nullable: true })
  tableId: string | null;

  @Column({ type: 'int', nullable: true })
  tableNumber: number | null;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actualDeliveryTime: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'unpaid' })
  paymentStatus: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCheckoutSessionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sepayTransactionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sepayReferenceCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  voucherId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voucherCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  voucherDiscount: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToMany(() => TenantOrderItem, (item) => item.order)
  orderItems: TenantOrderItem[];

  @ManyToOne(() => TenantTable, { nullable: true })
  @JoinColumn({ name: 'tableId' })
  table: TenantTable;
}

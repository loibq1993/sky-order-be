import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type VoucherType = 'percentage' | 'fixed_amount' | 'free_item';

@Entity('vouchers')
@Index('IDX_vouchers_code', ['code'], { unique: true, where: '"deletedAt" IS NULL' })
export class TenantVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameKo: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'percentage' })
  type: VoucherType;

  /** Percentage (e.g. 10 = 10%) or fixed amount in currency units. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ type: 'int', nullable: true })
  totalUsageLimit: number | null;

  @Column({ type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}

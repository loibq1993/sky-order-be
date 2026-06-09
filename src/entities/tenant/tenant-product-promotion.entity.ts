import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export type PromotionDiscountMode = 'percentage' | 'fixed_amount' | 'fixed_price';
export type PromotionScope = 'product' | 'category';
export type PromotionType = 'standard' | 'happy_hour' | 'buy_x_get_y';

@Entity('product_promotions')
export class TenantProductPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @Column({ type: 'varchar', length: 20, default: 'product' })
  scope: PromotionScope;

  @Column({ type: 'varchar', length: 20, default: 'standard' })
  promotionType: PromotionType;

  @Column({ type: 'varchar', length: 5, nullable: true })
  timeStart: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  timeEnd: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  daysOfWeek: string | null;

  @Column({ type: 'int', nullable: true })
  buyQuantity: number | null;

  @Column({ type: 'int', nullable: true })
  getQuantity: number | null;

  @Column({ type: 'uuid', nullable: true })
  rewardProductId: string | null;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'percentage' })
  discountMode: PromotionDiscountMode;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ type: 'timestamp' })
  validFrom: Date;

  @Column({ type: 'timestamp' })
  validUntil: Date;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantProduct } from './tenant-product.entity';
import { TenantCategory } from './tenant-category.entity';

@Entity('product_categories')
export class TenantProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => TenantProduct)
  @JoinColumn({ name: 'productId' })
  product: TenantProduct;

  @ManyToOne(() => TenantCategory)
  @JoinColumn({ name: 'categoryId' })
  category: TenantCategory;
}

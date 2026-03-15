import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantCategory } from './tenant-category.entity';

@Entity('products')
export class TenantProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  nameKo: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addNameKo: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionKo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoryKo: string | null;

  @Column({ type: 'boolean', default: true })
  available: boolean;

  @Column({ type: 'int', default: 0 })
  sales: number;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => TenantCategory)
  @JoinColumn({ name: 'categoryId' })
  categoryRelation: TenantCategory;
}

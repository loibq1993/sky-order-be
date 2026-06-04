import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantCombo } from './tenant-combo.entity';

@Entity('combo_items')
export class TenantComboItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  comboId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => TenantCombo, (combo) => combo.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comboId' })
  combo: TenantCombo;
}

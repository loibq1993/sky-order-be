import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('tables')
@Index('IDX_tenant_tables_table_number', ['tableNumber'], { unique: true })
export class TenantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  tableNumber: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qrCodeUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qrCodeImagePath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  orderUrl: string;

  @Column({ type: 'uuid', nullable: true })
  qrUuid: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'available',
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

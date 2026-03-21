import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants', schema: 'public' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  schemaName: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameKo: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionKo: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  coverImage: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 200, nullable: true, unique: true })
  customDomain: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  businessHours: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}

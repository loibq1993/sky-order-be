import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('tables')
export class Table {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string; // Tên bàn: "Bàn 1", "Bàn 2", etc.

    @Column({ type: 'int', unique: true })
    tableNumber: number; // Số bàn: 1, 2, 3, etc.

    @Column({ type: 'varchar', length: 500, nullable: true })
    qrCodeUrl: string; // URL QR code

    @Column({ type: 'varchar', length: 500, nullable: true })
    qrCodeImagePath: string; // Đường dẫn file QR code image

    @Column({ type: 'varchar', length: 500, nullable: true })
    orderUrl: string;

    @Column({ type: 'uuid', nullable: true })
    qrUuid: string; // UUID for QR code

    @Column({ type: 'enum', enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' })
    status: 'available' | 'occupied' | 'reserved' | 'maintenance';

    @Column({ type: 'int', default: 0 })
    capacity: number; // Sức chứa bàn (số người)

    @Column({ type: 'text', nullable: true })
    description: string; // Mô tả bàn

    @Column({ type: 'boolean', default: true })
    isActive: boolean; // Bàn có hoạt động không

    @Column({ type: 'uuid' })
    restaurantId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    // Relations
    @ManyToOne(() => Restaurant, restaurant => restaurant.tables)
    @JoinColumn({ name: 'restaurantId' })
    restaurant: Restaurant;
} 
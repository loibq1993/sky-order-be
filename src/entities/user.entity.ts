import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('users')
@Index('IDX_users_username_restaurant', ['username', 'restaurantId'], { unique: true })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    username: string;

    @Column({ type: 'varchar', length: 255 })
    passwordHash: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    firstName: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ 
        type: 'enum', 
        enum: ['super_admin', 'restaurant_owner', 'restaurant_manager', 'restaurant_staff', 'customer'], 
        default: 'restaurant_staff' 
    })
    role: string;

    @Column({ type: 'uuid', nullable: true })
    restaurantId: string | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @Column({ type: 'varchar', length: 45, nullable: true })
    lastLoginIp: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // Relations
    @ManyToOne(() => Restaurant, restaurant => restaurant.users, { nullable: true })
    @JoinColumn({ name: 'restaurantId' })
    restaurant: Restaurant;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { Table } from './table.entity';

@Entity('restaurants')
export class Restaurant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    nameKo: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    descriptionKo: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    logo: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    website: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    timezone: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    currency: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    language: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'json', nullable: true })
    settings: any; // Store restaurant-specific settings like tax rate, delivery fees, etc.

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // Relations
    @OneToMany(() => User, user => user.restaurant)
    users: User[];

    @OneToMany(() => Category, category => category.restaurant)
    categories: Category[];

    @OneToMany(() => Product, product => product.restaurant)
    products: Product[];

    @OneToMany(() => Order, order => order.restaurant)
    orders: Order[];

    @OneToMany(() => Table, table => table.restaurant)
    tables: Table[];
}

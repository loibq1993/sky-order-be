import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Category } from './category.entity';
import { ProductCategory } from './product-category.entity';
import { Restaurant } from './restaurant.entity';

@Entity('products')
export class Product {
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

    @Column({ type: 'uuid' })
    restaurantId: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // Relations
    @ManyToOne(() => Restaurant, restaurant => restaurant.products)
    @JoinColumn({ name: 'restaurantId' })
    restaurant: Restaurant;

    @ManyToOne('Category', 'products')
    @JoinColumn({ name: 'categoryId' })
    categoryRelation: Category;

    @OneToMany('ProductCategory', 'product')
    productCategories: ProductCategory[];
} 
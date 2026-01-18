import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { Restaurant } from './restaurant.entity';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 100 })
    nameKo: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    icon: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    descriptionKo: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'uuid' })
    restaurantId: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    // Relations
    @ManyToOne(() => Restaurant, restaurant => restaurant.categories)
    @JoinColumn({ name: 'restaurantId' })
    restaurant: Restaurant;

    @OneToMany('Product', 'categoryRelation')
    products: Product[];

    @OneToMany('ProductCategory', 'category')
    productCategories: ProductCategory[];
} 
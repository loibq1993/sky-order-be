import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './products.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
        private uploadService: UploadService,
    ) { }

    // Create a new product
    async create(createProductDto: CreateProductDto, tempImageFilename?: string): Promise<ProductResponseDto> {
        // Validate category exists
        const category = await this.categoryRepository.findOne({
            where: { id: createProductDto.categoryId, deletedAt: IsNull() },
        });

        if (!category) {
            throw new BadRequestException(`Category with ID ${createProductDto.categoryId} not found or inactive`);
        }

        // Set category name and nameKo from the category entity
        const productData = {
            ...createProductDto,
            category: category.name,
            categoryKo: category.nameKo,
            visible: createProductDto.visible !== undefined ? createProductDto.visible : true, // Default to visible
            available: createProductDto.available !== undefined ? createProductDto.available : true, // Default to available
        };

        const product = this.productRepository.create(productData);
        const savedProduct = await this.productRepository.save(product);

        // Move image from temp to products folder if provided
        if (tempImageFilename) {
            try {
                console.log('Original tempImageFilename (create):', tempImageFilename);
                // Extract just the filename from the path
                const filename = tempImageFilename.includes('/')
                    ? tempImageFilename.split('/').pop() || tempImageFilename
                    : tempImageFilename;
                console.log('Extracted filename (create):', filename);
                const moveResult = await this.uploadService.moveFromTemp(filename, 'products');
                // Update product with new image URL
                savedProduct.image = moveResult.url;
                await this.productRepository.save(savedProduct);
            } catch (error) {
                console.error('Failed to move image:', error);
                // Continue without image if move fails
            }
        }

        return this.mapToResponseDto(savedProduct);
    }

    // Get all visible and in-stock products
    async findAll(): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: {
                deletedAt: IsNull(),
                available: true,
                visible: true
            },
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
        });

        // Get order counts for all products
        const orderCounts = await this.getOrderCountsByProduct();

        // Map products with order counts
        return products.map(item => {
            return this.mapToResponseDto(item, orderCounts[item.id] || 0);
        });
    }

    // Get all visible and in-stock products with pagination and category filter
    async findAllPaginated(page: number = 1, limit: number = 10, categoryId?: string): Promise<{
        products: ProductResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const whereCondition: any = {
            deletedAt: IsNull(),
            available: true,
            visible: true
        };

        if (categoryId) {
            whereCondition.categoryId = categoryId;
        }

        const [products, total] = await this.productRepository.findAndCount({
            where: whereCondition,
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(total / limit);

        // Get order counts for all products
        const orderCounts = await this.getOrderCountsByProduct();

        return {
            products: products.map(item => this.mapToResponseDto(item, orderCounts[item.id] || 0)),
            total,
            page,
            limit,
            totalPages,
        };
    }

    // Get all products (including inactive and soft deleted)
    async findAllWithDeleted(): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            withDeleted: true,
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
        });
        return products.map(item => this.mapToResponseDto(item));
    }

    // Get visible and in-stock products by category
    // Get products by category (client - only visible and available)
    async findByCategory(categoryId: string): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: {
                categoryId,
                deletedAt: IsNull(),
                available: true,
                visible: true
            },
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
        });

        // Get order counts for products in this category
        const orderCounts = await this.getOrderCountsByProduct();

        return products.map(item => this.mapToResponseDto(item, orderCounts[item.id] || 0));
    }

    // Get products by category for admin (including hidden and unavailable)
    async findByCategoryForAdmin(categoryId: string): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: {
                categoryId,
                deletedAt: IsNull(),
            },
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
        });
        return products.map(item => this.mapToResponseDto(item));
    }

    // Get product by ID
    async findOne(id: string): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['categoryRelation'],
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return this.mapToResponseDto(product);
    }

    // Update product
    async update(id: string, updateProductDto: UpdateProductDto, tempImageFilename?: string): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
            relations: ['categoryRelation'],
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        // If categoryId is being updated, validate the new category exists
        if (updateProductDto.categoryId && updateProductDto.categoryId !== product.categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: updateProductDto.categoryId, deletedAt: IsNull() },
            });

            if (!category) {
                throw new BadRequestException(`Category with ID ${updateProductDto.categoryId} not found or inactive`);
            }

            // Update category name and nameKo from the category entity
            updateProductDto.category = category.name;
            updateProductDto.categoryKo = category.nameKo;
        }

        Object.assign(product, updateProductDto);
        const updatedProduct = await this.productRepository.save(product);

        if (tempImageFilename) {
            try {
                console.log('Original tempImageFilename:', tempImageFilename);
                const filename = tempImageFilename.includes('/')
                    ? tempImageFilename.split('/').pop() || tempImageFilename
                    : tempImageFilename;
                const moveResult = await this.uploadService.moveFromTemp(filename, 'products');
                updatedProduct.image = moveResult.url;
                await this.productRepository.save(updatedProduct);
            } catch (error) {
                console.error('Failed to move image:', error);
            }
        }

        return this.mapToResponseDto(updatedProduct);
    }

    // Soft delete product
    async remove(id: string): Promise<{ message: string }> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        await this.productRepository.softDelete(id);
        return { message: 'Product deleted successfully' };
    }

    // Restore soft deleted product
    async restore(id: string): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        await this.productRepository.restore(id);
        const restoredProduct = await this.productRepository.findOne({
            where: { id },
            relations: ['categoryRelation'],
        });
        if (!restoredProduct) {
            throw new NotFoundException(`Product with ID ${id} not found after restore`);
        }
        return this.mapToResponseDto(restoredProduct);
    }

    // Hard delete product
    async hardDelete(id: string): Promise<{ message: string }> {
        const product = await this.productRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        await this.productRepository.delete(id);
        return { message: 'Product permanently deleted' };
    }

    // Update product sales count
    async updateSales(id: string, salesCount: number): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        product.sales = salesCount;
        const updatedProduct = await this.productRepository.save(product);
        return this.mapToResponseDto(updatedProduct);
    }

    // Increment product sales count
    async incrementSales(id: string, increment: number = 1): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        product.sales += increment;
        const updatedProduct = await this.productRepository.save(product);
        return this.mapToResponseDto(updatedProduct);
    }

    // Search products (client - only visible and available)
    async search(query: string): Promise<ProductResponseDto[]> {
        const products = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.categoryRelation', 'category')
            .where('product.deletedAt IS NULL')
            .andWhere('product.available = :available', { available: true })
            .andWhere('product.visible = :visible', { visible: true })
            .andWhere(
                '(product.name LIKE :query OR product.nameKo LIKE :query OR product.description LIKE :query)',
                { query: `%${query}%` }
            )
            .orderBy('product.createdAt', 'ASC')
            .getMany();

        // Get order counts for searched products
        const orderCounts = await this.getOrderCountsByProduct();

        return products.map(item => this.mapToResponseDto(item, orderCounts[item.id] || 0));
    }

    // Search products for admin (including hidden and unavailable)
    async searchForAdmin(query: string): Promise<ProductResponseDto[]> {
        const products = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.categoryRelation', 'category')
            .where('product.deletedAt IS NULL')
            .andWhere(
                '(product.name LIKE :query OR product.nameKo LIKE :query OR product.description LIKE :query)',
                { query: `%${query}%` }
            )
            .orderBy('product.createdAt', 'ASC')
            .getMany();

        return products.map(item => this.mapToResponseDto(item));
    }

    // Get popular products (client - only visible and available)
    async getPopular(limit: number = 10): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: {
                deletedAt: IsNull(),
                available: true,
                visible: true
            },
            relations: ['categoryRelation'],
            order: { sales: 'DESC', createdAt: 'ASC' },
            take: limit,
        });

        // Get order counts for popular products
        const orderCounts = await this.getOrderCountsByProduct();

        return products.map(item => this.mapToResponseDto(item, orderCounts[item.id] || 0));
    }

    // Get popular products for admin (including hidden and unavailable)
    async getPopularForAdmin(limit: number = 10): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: {
                deletedAt: IsNull(),
            },
            relations: ['categoryRelation'],
            order: { sales: 'DESC', createdAt: 'ASC' },
            take: limit,
        });
        return products.map(item => this.mapToResponseDto(item));
    }

    // Toggle product visibility
    async toggleVisibility(id: string): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        product.visible = !product.visible;
        const updatedProduct = await this.productRepository.save(product);
        return this.mapToResponseDto(updatedProduct);
    }

    // Toggle product availability
    async toggleAvailability(id: string): Promise<ProductResponseDto> {
        const product = await this.productRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        product.available = !product.available;
        const updatedProduct = await this.productRepository.save(product);
        return this.mapToResponseDto(updatedProduct);
    }

    // Get all products for admin (including hidden and unavailable)
    async findAllForAdmin(): Promise<ProductResponseDto[]> {
        const products = await this.productRepository.find({
            where: { deletedAt: IsNull() },
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
        });
        return products.map(item => this.mapToResponseDto(item));
    }

    // Get all products for admin with pagination (including hidden and unavailable)
    async getOrderCountsByProduct(): Promise<{ [productId: string]: number }> {
        // First, let's check if there are any order items at all
        const totalOrderItems = await this.productRepository
            .createQueryBuilder('product')
            .leftJoin('order_items', 'oi', 'oi.productId = product.id')
            .getCount();

        console.log('Total order items in database:', totalOrderItems);

        const result = await this.productRepository
            .createQueryBuilder('product')
            .leftJoin('order_items', 'oi', 'oi.productId = product.id')
            .leftJoin('orders', 'o', 'o.id = oi.orderId')
            .select('product.id', 'productId')
            .addSelect('product.name', 'productName')
            .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
            .groupBy('product.id')
            .addGroupBy('product.name')
            .getRawMany();

        const orderCounts: { [productId: string]: number } = {};
        result.forEach(item => {
            orderCounts[item.productId] = parseInt(item.orderCount) || 0;
            console.log(`Product ${item.productName} (${item.productId}): ${item.orderCount} orders`);
        });

        console.log('Final order counts by product:', orderCounts);
        return orderCounts;
    }

    // Get count of active products
    async getActiveProductsCount(): Promise<number> {
        return this.productRepository.count({
            where: {
                deletedAt: IsNull(),
                available: true,
                visible: true
            }
        });
    }

    async findAllForAdminPaginated(page: number = 1, limit: number = 10, includeDeleted: boolean = false, categoryId?: string): Promise<{
        products: ProductResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const whereCondition: any = {};
        if (categoryId) {
            whereCondition.categoryId = categoryId;
        }

        // Fix logic for deleted status filter
        if (includeDeleted) {
            // When includeDeleted = true, only get records that are actually deleted (deletedAt IS NOT NULL)
            whereCondition.deletedAt = Not(IsNull());
        } else {
            // When includeDeleted = false, only get records that are not deleted (deletedAt IS NULL)
            whereCondition.deletedAt = IsNull();
        }

        const [products, total] = await this.productRepository.findAndCount({
            where: whereCondition,
            relations: ['categoryRelation'],
            order: { createdAt: 'ASC' },
            skip,
            take: limit,
            ...(includeDeleted && { withDeleted: true }), // Only include deleted records when needed
        });

        const totalPages = Math.ceil(total / limit);

        return {
            products: products.map(item => this.mapToResponseDto(item)),
            total,
            page,
            limit,
            totalPages,
        };
    }


    private mapToResponseDto(product: Product, orderCount?: number): ProductResponseDto {
        return {
            id: product.id,
            name: product.name,
            nameKo: product.nameKo,
            description: product.description,
            descriptionKo: product.descriptionKo,
            price: product.price,
            image: product.image,
            categoryId: product.categoryId || undefined,
            category: product.category || undefined,
            categoryKo: product.categoryKo || undefined,
            visible: product.visible,
            available: product.available,
            sales: product.sales,
            orderCount: orderCount || 0,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            deletedAt: product.deletedAt,
        };
    }
} 
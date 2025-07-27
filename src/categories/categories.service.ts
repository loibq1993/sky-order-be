import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './categories.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        const category = this.categoryRepository.create(createCategoryDto);
        const savedCategory = await this.categoryRepository.save(category);
        return this.mapToResponseDto(savedCategory);
    }

    async findAll(): Promise<CategoryResponseDto[]> {
        const categories = await this.categoryRepository.find({
            where: { deletedAt: IsNull() },
            order: { createdAt: 'DESC' }
        });
        return categories.map(category => this.mapToResponseDto(category));
    }

    async findAllPaginated(page: number = 1, limit: number = 10, includeDeleted: boolean = false): Promise<{
        categories: CategoryResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [categories, total] = await this.categoryRepository.findAndCount({
            where: includeDeleted ? {} : { deletedAt: IsNull() },
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
            ...(includeDeleted && { withDeleted: true }),
        });

        const totalPages = Math.ceil(total / limit);

        return {
            categories: categories.map(category => this.mapToResponseDto(category)),
            total,
            page,
            limit,
            totalPages,
        };
    }

    async findAllWithDeleted(): Promise<CategoryResponseDto[]> {
        const categories = await this.categoryRepository.find({
            withDeleted: true,
            order: { createdAt: 'DESC' }
        });
        return categories.map(category => this.mapToResponseDto(category));
    }

    async findOne(id: string): Promise<CategoryResponseDto> {
        const category = await this.categoryRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        return this.mapToResponseDto(category);
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
        const category = await this.categoryRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        Object.assign(category, updateCategoryDto);
        const updatedCategory = await this.categoryRepository.save(category);
        return this.mapToResponseDto(updatedCategory);
    }

    async remove(id: string): Promise<{ message: string }> {
        const category = await this.categoryRepository.findOne({
            where: { id, deletedAt: IsNull() }
        });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        await this.categoryRepository.softDelete(id);
        return { message: 'Category deleted successfully' };
    }

    async restore(id: string): Promise<CategoryResponseDto> {
        const category = await this.categoryRepository.findOne({
            where: { id },
            withDeleted: true
        });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        await this.categoryRepository.restore(id);
        const restoredCategory = await this.categoryRepository.findOne({
            where: { id }
        });
        if (!restoredCategory) {
            throw new NotFoundException(`Category with ID ${id} not found after restore`);
        }
        return this.mapToResponseDto(restoredCategory);
    }

    async hardDelete(id: string): Promise<{ message: string }> {
        const category = await this.categoryRepository.findOne({
            where: { id },
            withDeleted: true
        });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        await this.categoryRepository.delete(id);
        return { message: 'Category permanently deleted' };
    }

    async findWithMenuCount(): Promise<(CategoryResponseDto & { menuCount: number })[]> {
        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .leftJoin('category.products', 'product')
            .addSelect('COUNT(product.id)', 'menuCount')
            .where('category.deletedAt IS NULL')
            .andWhere('product.deletedAt IS NULL OR product.deletedAt IS NULL')
            .groupBy('category.id')
            .orderBy('category.createdAt', 'DESC')
            .getRawAndEntities();

        return categories.entities.map((category, index) => ({
            ...this.mapToResponseDto(category),
            menuCount: parseInt(categories.raw[index].menuCount) || 0
        }));
    }

    async findOneWithProductCount(id: string): Promise<CategoryResponseDto & { productCount: number }> {
        const category = await this.categoryRepository
            .createQueryBuilder('category')
            .leftJoin('category.products', 'product')
            .addSelect('COUNT(product.id)', 'productCount')
            .where('category.id = :id', { id })
            .andWhere('category.deletedAt IS NULL')
            .andWhere('product.deletedAt IS NULL OR product.deletedAt IS NULL')
            .groupBy('category.id')
            .getRawAndEntities();

        if (!category.entities.length) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        return {
            ...this.mapToResponseDto(category.entities[0]),
            productCount: parseInt(category.raw[0].productCount) || 0
        };
    }

    async search(query: string): Promise<CategoryResponseDto[]> {
        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .where('category.deletedAt IS NULL')
            .andWhere(
                '(category.name LIKE :query OR category.nameKo LIKE :query OR category.description LIKE :query)',
                { query: `%${query}%` }
            )
            .orderBy('category.createdAt', 'DESC')
            .getMany();

        return categories.map(category => this.mapToResponseDto(category));
    }

    private mapToResponseDto(category: Category): CategoryResponseDto {
        return {
            id: category.id,
            name: category.name,
            nameKo: category.nameKo,
            icon: category.icon,
            description: category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            deletedAt: category.deletedAt,
        };
    }
} 
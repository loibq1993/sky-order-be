import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { TenantCategory } from '../entities/tenant/tenant-category.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly tenantSchemaService: TenantSchemaService) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    restaurantId: string,
  ): Promise<CategoryResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = repo.create(createCategoryDto);
      const saved = await repo.save(category);
      return this.mapToResponseDto(saved);
    });
  }

  async findAll(restaurantId: string): Promise<CategoryResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const categories = await repo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      return categories.map((c) => this.mapToResponseDto(c));
    });
  }

  async findAllPaginated(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    includeDeleted: boolean = false,
  ) {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const [categories, total] = await repo.findAndCount({
        where: includeDeleted ? {} : { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
        ...(includeDeleted && { withDeleted: true }),
      });
      return {
        categories: categories.map((c) => this.mapToResponseDto(c)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  async findAllWithDeleted(restaurantId: string): Promise<CategoryResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const categories = await repo.find({
        withDeleted: true,
        order: { createdAt: 'DESC' },
      });
      return categories.map((c) => this.mapToResponseDto(c));
    });
  }

  async findOne(id: string, restaurantId: string): Promise<CategoryResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      return this.mapToResponseDto(category);
    });
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    restaurantId: string,
  ): Promise<CategoryResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      Object.assign(category, updateCategoryDto);
      const saved = await repo.save(category);
      return this.mapToResponseDto(saved);
    });
  }

  async remove(id: string, restaurantId: string): Promise<{ message: string }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      await repo.softDelete(id);
      return { message: 'Category deleted successfully' };
    });
  }

  async restore(id: string, restaurantId: string): Promise<CategoryResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      await repo.restore(id);
      const restored = await repo.findOne({ where: { id } });
      if (!restored) {
        throw new NotFoundException(`Category with ID ${id} not found after restore`);
      }
      return this.mapToResponseDto(restored);
    });
  }

  async hardDelete(id: string, restaurantId: string): Promise<{ message: string }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      await repo.delete(id);
      return { message: 'Category permanently deleted' };
    });
  }

  async findWithMenuCount(
    restaurantId: string,
  ): Promise<(CategoryResponseDto & { menuCount: number })[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const catRepo = manager.getRepository(TenantCategory);
      const prodRepo = manager.getRepository(TenantProduct);
      const categories = await catRepo.find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      const result = await Promise.all(
        categories.map(async (cat) => {
          const menuCount = await prodRepo.count({
            where: { categoryId: cat.id, deletedAt: IsNull() },
          });
          return {
            ...this.mapToResponseDto(cat),
            menuCount,
          };
        }),
      );
      return result;
    });
  }

  async findOneWithProductCount(
    id: string,
    restaurantId: string,
  ): Promise<CategoryResponseDto & { productCount: number }> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const catRepo = manager.getRepository(TenantCategory);
      const prodRepo = manager.getRepository(TenantProduct);
      const category = await catRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      const productCount = await prodRepo.count({
        where: { categoryId: category.id, deletedAt: IsNull() },
      });
      return {
        ...this.mapToResponseDto(category),
        productCount,
      };
    });
  }

  async search(query: string, restaurantId: string): Promise<CategoryResponseDto[]> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const qb = repo
        .createQueryBuilder('category')
        .where('category.deletedAt IS NULL')
        .andWhere(
          '(category.name ILIKE :query OR category.nameKo ILIKE :query OR category.description ILIKE :query OR category.descriptionKo ILIKE :query)',
          { query: `%${query}%` },
        )
        .orderBy('category.createdAt', 'DESC');
      const categories = await qb.getMany();
      return categories.map((c) => this.mapToResponseDto(c));
    });
  }

  async toggleActive(id: string, restaurantId: string): Promise<CategoryResponseDto> {
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantCategory);
      const category = await repo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      category.isActive = !category.isActive;
      const saved = await repo.save(category);
      return this.mapToResponseDto(saved);
    });
  }

  private mapToResponseDto(category: TenantCategory): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      nameKo: category.nameKo,
      description: category.description ?? undefined,
      descriptionKo: category.descriptionKo ?? undefined,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt ?? undefined,
    };
  }
}

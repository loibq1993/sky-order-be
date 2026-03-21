import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Like } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant/tenant-user.entity';
import { TenantCategory } from '../entities/tenant/tenant-category.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantOrder } from '../entities/tenant/tenant-order.entity';
import { TenantTable } from '../entities/tenant/tenant-table.entity';
import { TenantService } from '../tenant/tenant.service';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantService: TenantService,
    private tenantSchemaService: TenantSchemaService,
  ) {}

  // Tenant (restaurant) management - delegate to TenantService, keep API shape
  async createRestaurant(dto: CreateRestaurantDto) {
    return this.tenantService.createTenant({
      name: dto.name,
      nameKo: dto.nameKo,
      description: dto.description,
      descriptionKo: dto.descriptionKo,
      logo: dto.logo,
      coverImage: dto.coverImage,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      customDomain: dto.customDomain,
      timezone: dto.timezone,
      currency: dto.currency,
      language: dto.language,
      settings: dto.settings,
      businessHours: dto.businessHours,
    });
  }

  async findAllRestaurants(page: number = 1, limit: number = 10, search?: string) {
    const result = await this.tenantService.findAll(page, limit, search);
    return {
      restaurants: result.tenants,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async findRestaurantById(id: string) {
    return this.tenantService.findById(id);
  }

  async findRestaurantPublicById(id: string) {
    return this.tenantService.findPublicById(id);
  }

  async findRestaurantByDomain(domain: string) {
    return this.tenantService.findByDomain(domain);
  }

  async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
    return this.tenantService.updateTenant(id, dto);
  }

  async deleteRestaurant(id: string) {
    await this.tenantService.deleteTenant(id);
  }

  async getRestaurantStats(id: string) {
    const tenant = await this.tenantService.findById(id);
    const stats = await this.tenantSchemaService.runInTenant(id, async (manager) => {
      const [totalCategories, totalProducts, totalTables, totalOrders, totalUsers] =
        await Promise.all([
          manager.getRepository(TenantCategory).count(),
          manager.getRepository(TenantProduct).count(),
          manager.getRepository(TenantTable).count(),
          manager.getRepository(TenantOrder).count(),
          manager.getRepository(TenantUser).count({ where: { deletedAt: IsNull() } }),
        ]);
      return {
        totalCategories,
        totalProducts,
        totalTables,
        totalOrders,
        totalUsers,
      };
    });
    return {
      restaurant: tenant,
      stats,
    };
  }

  // User management (tenant-scoped)
  async createUser(createUserDto: CreateUserDto) {
    const tenantId = createUserDto.restaurantId;
    if (!tenantId) {
      throw new BadRequestException('restaurantId (tenant) is required to create user');
    }
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    return this.tenantSchemaService.runInTenant(tenantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const existing = await repo.findOne({ where: { username: createUserDto.username } });
      if (existing) throw new BadRequestException('Username already exists');
      if (createUserDto.email) {
        const existingEmail = await repo.findOne({ where: { email: createUserDto.email } });
        if (existingEmail) throw new BadRequestException('Email already exists');
      }
      const user = repo.create({
        username: createUserDto.username,
        passwordHash,
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        role: createUserDto.role || 'restaurant_staff',
        isActive: true,
      });
      const saved = await repo.save(user);
      const { passwordHash: _, ...out } = saved;
      return out;
    });
  }

  async findAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    restaurantId?: string,
  ) {
    if (!restaurantId) {
      throw new BadRequestException('restaurantId (tenant) is required to list users');
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const qb = repo
        .createQueryBuilder('user')
        .where('user.deletedAt IS NULL');
      if (search) {
        qb.andWhere(
          '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
          { search: `%${search}%` },
        );
      }
      const [users, total] = await qb
        .orderBy('user.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      return {
        users: users.map((u) => {
          const { passwordHash, ...rest } = u;
          return rest;
        }),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  async findUserById(id: string, restaurantId: string) {
    if (!restaurantId) {
      throw new BadRequestException('restaurantId (tenant) is required');
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      const { passwordHash, ...out } = user;
      return out;
    });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, restaurantId: string) {
    if (!restaurantId) {
      throw new BadRequestException('restaurantId (tenant) is required');
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existing = await repo.findOne({ where: { username: updateUserDto.username } });
        if (existing) throw new BadRequestException('Username already exists');
      }
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existing = await repo.findOne({ where: { email: updateUserDto.email } });
        if (existing) throw new BadRequestException('Email already exists');
      }
      if (updateUserDto.password) {
        (user as any).passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      }
      Object.assign(user, {
        username: updateUserDto.username ?? user.username,
        email: updateUserDto.email ?? user.email,
        firstName: updateUserDto.firstName ?? user.firstName,
        lastName: updateUserDto.lastName ?? user.lastName,
        phone: updateUserDto.phone ?? user.phone,
        role: updateUserDto.role ?? user.role,
      });
      const saved = await repo.save(user);
      const { passwordHash, ...out } = saved;
      return out;
    });
  }

  async deleteUser(id: string, restaurantId: string) {
    if (!restaurantId) {
      throw new BadRequestException('restaurantId (tenant) is required');
    }
    await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      await repo.softDelete(id);
    });
  }

  async toggleUserStatus(id: string, restaurantId: string) {
    if (!restaurantId) {
      throw new BadRequestException('restaurantId (tenant) is required');
    }
    return this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      user.isActive = !user.isActive;
      const saved = await repo.save(user);
      const { passwordHash, ...out } = saved;
      return out;
    });
  }

  async getSystemStats() {
    const [totalRestaurants, activeRestaurants] = await Promise.all([
      this.tenantRepository.count({ where: { deletedAt: IsNull() } }),
      this.tenantRepository.count({ where: { isActive: true, deletedAt: IsNull() } }),
    ]);
    return {
      totalRestaurants,
      totalUsers: 0,
      totalCategories: 0,
      totalProducts: 0,
      totalTables: 0,
      totalOrders: 0,
      activeRestaurants,
      activeUsers: 0,
    };
  }
}

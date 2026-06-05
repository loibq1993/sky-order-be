import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { ConfigService } from '@nestjs/config';
import {
  sanitizeTenantSettingsForAdmin,
  sanitizeTenantSettingsForPublic,
} from '../payments/stripe-config.util';
import {
  toAdminSepaySettings,
  toPublicSepaySettings,
} from '../payments/sepay-config.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantService: TenantService,
    private tenantSchemaService: TenantSchemaService,
    private configService: ConfigService,
  ) {}

  private sanitizePublic(tenant: Tenant): Tenant {
    return {
      ...tenant,
      settings: sanitizeTenantSettingsForPublic(
        tenant,
        toPublicSepaySettings(tenant) as unknown as Record<string, unknown>,
      ) as Tenant['settings'],
    };
  }

  private getApiPublicBase(): string {
    return process.env.API_BASE_URL?.trim() || 'http://localhost:4500';
  }

  private sanitizeAdmin(tenant: Tenant): Tenant {
    const apiPublicBase = this.getApiPublicBase();
    return {
      ...tenant,
      settings: sanitizeTenantSettingsForAdmin(
        tenant,
        apiPublicBase,
        toAdminSepaySettings(tenant, apiPublicBase) as unknown as Record<string, unknown>,
      ) as Tenant['settings'],
    };
  }

  // Tenant (restaurant) management - delegate to TenantService, keep API shape
  async createRestaurant(dto: CreateRestaurantDto) {
    const tenant = await this.tenantService.createTenant({
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
    return this.sanitizeAdmin(tenant);
  }

  async findAllRestaurants(page: number = 1, limit: number = 10, search?: string) {
    const result = await this.tenantService.findAll(page, limit, search);
    return {
      restaurants: result.tenants.map((t) => this.sanitizeAdmin(t)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async findRestaurantById(id: string) {
    const tenant = await this.tenantService.findById(id);
    return this.sanitizeAdmin(tenant);
  }

  async findRestaurantPublicById(id: string) {
    const tenant = await this.tenantService.findPublicById(id);
    return this.sanitizePublic(tenant);
  }

  async findRestaurantByDomain(domain: string) {
    return this.tenantService.findByDomain(domain);
  }

  async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
    const tenant = await this.tenantService.updateTenant(id, dto);
    return this.sanitizeAdmin(tenant);
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
    if (restaurantId) {
      const tenant = await this.tenantService.findById(restaurantId);
      const result = await this.queryUsersInTenant(restaurantId, search);
      const start = (page - 1) * limit;
      const users = result
        .slice(start, start + limit)
        .map((u) => this.attachRestaurantToUser(u, tenant));
      return {
        users,
        total: result.length,
        page,
        limit,
        totalPages: Math.ceil(result.length / limit) || 1,
      };
    }

    const tenants = await this.tenantRepository.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    const allUsers: Array<ReturnType<AdminService['attachRestaurantToUser']>> = [];
    for (const tenant of tenants) {
      const tenantUsers = await this.queryUsersInTenant(tenant.id, search);
      for (const user of tenantUsers) {
        allUsers.push(this.attachRestaurantToUser(user, tenant));
      }
    }
    allUsers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = allUsers.length;
    const start = (page - 1) * limit;
    return {
      users: allUsers.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private attachRestaurantToUser(
    user: Omit<TenantUser, 'passwordHash'>,
    tenant: Tenant,
  ) {
    return {
      ...user,
      restaurantId: tenant.id,
      restaurant: {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
      },
    };
  }

  private async queryUsersInTenant(
    restaurantId: string,
    search?: string,
  ): Promise<Array<Omit<TenantUser, 'passwordHash'>>> {
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
      const users = await qb.orderBy('user.createdAt', 'DESC').getMany();
      return users.map((u) => {
        const { passwordHash, ...rest } = u;
        return rest;
      });
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

  private readonly staffLikeRoles = [
    'restaurant_staff',
    'staff_reception',
    'staff_kitchen',
    'staff_waiter',
  ];

  canTenantActorAssignRole(actorRole: string, newRole: string): boolean {
    if (actorRole === 'super_admin') return true;
    if (newRole === 'super_admin' || newRole === 'restaurant_owner') return false;
    if (actorRole === 'restaurant_owner') {
      return (
        newRole === 'restaurant_manager' ||
        this.staffLikeRoles.includes(newRole) ||
        newRole === 'customer'
      );
    }
    if (actorRole === 'restaurant_manager') {
      return this.staffLikeRoles.includes(newRole) || newRole === 'customer';
    }
    return false;
  }

  canTenantActorManageTarget(
    actorRole: string,
    targetRole: string,
    actorUserId: string,
    targetUserId: string,
  ): boolean {
    if (actorRole === 'super_admin') return true;
    if (actorUserId === targetUserId) return true;
    if (actorRole === 'restaurant_owner') {
      if (targetRole === 'restaurant_owner') return false;
      return true;
    }
    if (actorRole === 'restaurant_manager') {
      if (targetRole === 'restaurant_owner') return false;
      if (targetRole === 'restaurant_manager') return false;
      return true;
    }
    return false;
  }

  async createUserForTenant(
    dto: CreateUserDto,
    actorRole: string,
    _actorUserId: string,
  ) {
    const role = dto.role || 'restaurant_staff';
    if (!this.canTenantActorAssignRole(actorRole, role)) {
      throw new ForbiddenException('You cannot assign this role');
    }
    return this.createUser({ ...dto, role });
  }

  async updateUserForTenant(
    id: string,
    updateUserDto: UpdateUserDto,
    restaurantId: string,
    actorRole: string,
    actorUserId: string,
  ) {
    const existing = await this.findUserById(id, restaurantId);
    if (!this.canTenantActorManageTarget(actorRole, existing.role, actorUserId, id)) {
      throw new ForbiddenException('You cannot modify this user');
    }
    const nextRole = updateUserDto.role ?? existing.role;
    if (updateUserDto.role !== undefined && !this.canTenantActorAssignRole(actorRole, nextRole)) {
      throw new ForbiddenException('You cannot assign this role');
    }
    return this.updateUser(id, updateUserDto, restaurantId);
  }

  async deleteUserForTenant(
    id: string,
    restaurantId: string,
    actorRole: string,
    actorUserId: string,
  ) {
    if (id === actorUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    const existing = await this.findUserById(id, restaurantId);
    if (!this.canTenantActorManageTarget(actorRole, existing.role, actorUserId, id)) {
      throw new ForbiddenException('You cannot delete this user');
    }
    if (existing.role === 'restaurant_owner' || existing.role === 'restaurant_manager') {
      throw new ForbiddenException(
        'Không được xóa tài khoản chủ nhà hàng hoặc quản lý. Có thể khóa tài khoản thay vì xóa.',
      );
    }
    return this.deleteUser(id, restaurantId);
  }

  async toggleUserStatusForTenant(
    id: string,
    restaurantId: string,
    actorRole: string,
    actorUserId: string,
  ) {
    if (id === actorUserId) {
      throw new BadRequestException('Cannot toggle your own account status');
    }
    const existing = await this.findUserById(id, restaurantId);
    if (!this.canTenantActorManageTarget(actorRole, existing.role, actorUserId, id)) {
      throw new ForbiddenException('You cannot change this user status');
    }
    return this.toggleUserStatus(id, restaurantId);
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

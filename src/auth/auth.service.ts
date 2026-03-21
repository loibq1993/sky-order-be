import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PlatformUser } from '../entities/platform-user.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantUser } from '../entities/tenant/tenant-user.entity';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { TenantService } from '../tenant/tenant.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { normalizeDomain } from '../utils/domain';

export type AuthUser = {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  restaurantId: string | null;
  tenant?: Tenant;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PlatformUser)
    private platformUserRepository: Repository<PlatformUser>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private tenantSchemaService: TenantSchemaService,
    private tenantService: TenantService,
  ) {}

  /**
   * Validate user: first try platform_users (super_admin); then if tenantId provided, try that tenant's users.
   */
  async validateUser(
    username: string,
    password: string,
    tenantId?: string,
  ): Promise<AuthUser | null> {
    const platformUser = await this.platformUserRepository.findOne({
      where: { username },
    });
    if (platformUser && (await bcrypt.compare(password, platformUser.passwordHash))) {
      return {
        id: platformUser.id,
        username: platformUser.username,
        email: platformUser.email ?? undefined,
        firstName: undefined,
        lastName: undefined,
        role: 'super_admin',
        restaurantId: null,
      };
    }

    if (tenantId) {
      const tenantUser = await this.tenantSchemaService.runInTenant(
        tenantId,
        async (manager) => {
          const repo = manager.getRepository(TenantUser);
          const user = await repo.findOne({
            where: { username, isActive: true },
          });
          if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return null;
          }
          return user;
        },
      );
      if (tenantUser) {
        const tenant = await this.tenantService.findPublicById(tenantId);
        return {
          id: tenantUser.id,
          username: tenantUser.username,
          email: tenantUser.email ?? undefined,
          firstName: tenantUser.firstName ?? undefined,
          lastName: tenantUser.lastName ?? undefined,
          role: tenantUser.role,
          restaurantId: tenantId,
          tenant,
        };
      }
    }

    return null;
  }

  async loginAsCustomer(loginDto: LoginDto) {
    const tenantId = loginDto.tenantId ?? (loginDto as any).tenantIdFromDomain;
    if (!tenantId) {
      throw new BadRequestException('Tenant context required for customer login. Send X-Tenant-Domain (or use storefront origin).');
    }
    const user = await this.validateUser(
      loginDto.username,
      loginDto.password,
      tenantId,
    );
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    }
    if (user.role !== 'customer') {
      throw new ForbiddenException('Use the admin login page for staff accounts');
    }
    return this.loginWithUser(user, loginDto);
  }

  /**
   * Validate only tenant user (no platform/super_admin). Used when request is from tenant domain.
   */
  private async validateTenantUserOnly(
    username: string,
    password: string,
    tenantId: string,
  ): Promise<AuthUser | null> {
    const tenantUser = await this.tenantSchemaService.runInTenant(
      tenantId,
      async (manager) => {
        const repo = manager.getRepository(TenantUser);
        const user = await repo.findOne({
          where: { username, isActive: true },
        });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          return null;
        }
        return user;
      },
    );
    if (!tenantUser) return null;
    const tenant = await this.tenantService.findPublicById(tenantId);
    return {
      id: tenantUser.id,
      username: tenantUser.username,
      email: tenantUser.email ?? undefined,
      firstName: tenantUser.firstName ?? undefined,
      lastName: tenantUser.lastName ?? undefined,
      role: tenantUser.role,
      restaurantId: tenantId,
      tenant,
    };
  }

  async login(loginDto: LoginDto) {
    const normalized = normalizeDomain((loginDto as any).hostForTenantResolution as string | undefined);
    const hostname = normalized.split(':')[0] ?? '';
    const rootDomains: string[] = this.configService.get('app.rootDomains') ?? ['localhost', '127.0.0.1'];
    /** Platform host: APP_ROOT_DOMAIN hoặc `admin.{root}` */
    const isRootDomain =
      !!hostname &&
      rootDomains.some((r: string) => {
        const root = r.trim().toLowerCase();
        return hostname === root || hostname === `admin.${root}`;
      });
    if (isRootDomain) {
      // Platform root: allow super_admin and tenant users (with tenantId from domain or body)
      const tenantId = loginDto.tenantId ?? (loginDto as any).tenantIdFromDomain;
      const user = await this.validateUser(
        loginDto.username,
        loginDto.password,
        tenantId,
      );
      if (!user) {
        throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
      }
      return this.loginWithUser(user, loginDto);
    }

    // Non-root: treat as tenant domain; only allow tenant users, block super_admin
    const tenantFromDomain = hostname ? await this.tenantService.findByDomain(hostname) : null;
    let tenantId = tenantFromDomain?.id ?? null;

    const tenantIdFromGuard = (loginDto as any).tenantIdFromDomain as string | undefined;
    if (!tenantId && tenantIdFromGuard) {
      try {
        const t = await this.tenantService.findPublicById(tenantIdFromGuard);
        tenantId = t.id;
      } catch {
        tenantId = null;
      }
    }

    if (!tenantId && loginDto.tenantId) {
      try {
        const t = await this.tenantService.findPublicById(loginDto.tenantId);
        tenantId = t.id;
      } catch {
        tenantId = null;
      }
    }

    if (tenantFromDomain?.id && loginDto.tenantId && tenantFromDomain.id !== loginDto.tenantId) {
      throw new UnauthorizedException('Tenant mismatch for this domain');
    }

    if (!tenantId) {
      throw new UnauthorizedException(
        'Could not resolve tenant for this domain. Register the custom domain in restaurant settings, use the platform root URL for super admin, or sign in with a tenant account.',
      );
    }

    const platformUser = await this.platformUserRepository.findOne({
      where: { username: loginDto.username },
    });
    if (
      platformUser &&
      (await bcrypt.compare(loginDto.password, platformUser.passwordHash))
    ) {
      throw new UnauthorizedException(
        'Use the platform admin URL (e.g. localhost) to sign in as super admin.',
      );
    }
    const user = await this.validateTenantUserOnly(
      loginDto.username,
      loginDto.password,
      tenantId,
    );
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    }
    return this.loginWithUser(user, loginDto);
  }

  private async loginWithUser(user: AuthUser, loginDto: LoginDto) {
    if (user.restaurantId) {
      await this.tenantSchemaService.runInTenant(user.restaurantId, async (manager) => {
        const repo = manager.getRepository(TenantUser);
        await repo.update(
          { id: user.id },
          {
            lastLoginAt: new Date(),
            ...(loginDto.ip && { lastLoginIp: loginDto.ip }),
          },
        );
      });
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const response: { access_token: string; user: any } = {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        restaurant: user.tenant ?? null,
      },
    };
    return response;
  }

  async register(registerDto: RegisterDto) {
    if (!registerDto.restaurantId) {
      throw new BadRequestException('Tenant ID (restaurantId or tenantId) is required for registration');
    }
    const tenantId = (registerDto as any).tenantId ?? registerDto.restaurantId;

    const existing = await this.tenantSchemaService.runInTenant(tenantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      return repo.findOne({ where: { username: registerDto.username } });
    });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    if (registerDto.email) {
      const existingEmail = await this.tenantSchemaService.runInTenant(tenantId, async (manager) => {
        const repo = manager.getRepository(TenantUser);
        return repo.findOne({ where: { email: registerDto.email } });
      });
      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const saved = await this.tenantSchemaService.runInTenant(tenantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = repo.create({
        username: registerDto.username,
        passwordHash,
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: registerDto.role || 'customer',
        isActive: true,
      });
      return repo.save(user);
    });

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async createRestaurantOwner(restaurantData: any, userData: any) {
    const tenant = await this.tenantService.createTenant({
      name: restaurantData.name,
      nameKo: restaurantData.nameKo,
      description: restaurantData.description,
      descriptionKo: restaurantData.descriptionKo,
      address: restaurantData.address,
      phone: restaurantData.phone,
      email: restaurantData.email,
      customDomain: restaurantData.customDomain,
      timezone: restaurantData.timezone,
      currency: restaurantData.currency,
      language: restaurantData.language,
      settings: restaurantData.settings,
      businessHours: restaurantData.businessHours,
    });

    const owner = await this.tenantService.seedOwner(tenant.id, {
      username: userData.username,
      password: userData.password,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
    });

    return {
      restaurant: tenant,
      user: {
        id: owner.id,
        username: owner.username,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: owner.role,
        restaurant: tenant,
      },
    };
  }

  async getProfile(userId: string, restaurantId: string | null): Promise<AuthUser | null> {
    if (!restaurantId) {
      const platformUser = await this.platformUserRepository.findOne({
        where: { id: userId },
      });
      if (!platformUser) return null;
      return {
        id: platformUser.id,
        username: platformUser.username,
        email: platformUser.email ?? undefined,
        firstName: undefined,
        lastName: undefined,
        role: 'super_admin',
        restaurantId: null,
      };
    }

    const tenantUser = await this.tenantSchemaService.runInTenant(
      restaurantId,
      async (manager) => {
        const repo = manager.getRepository(TenantUser);
        return repo.findOne({
          where: { id: userId, isActive: true },
        });
      },
    );
    if (!tenantUser) return null;

    const tenant = await this.tenantService.findPublicById(restaurantId);
    return {
      id: tenantUser.id,
      username: tenantUser.username,
      email: tenantUser.email ?? undefined,
      firstName: tenantUser.firstName ?? undefined,
      lastName: tenantUser.lastName ?? undefined,
      role: tenantUser.role,
      restaurantId,
      tenant,
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    restaurantId: string | null,
  ) {
    if (!restaurantId) {
      const platformUser = await this.platformUserRepository.findOne({
        where: { id: userId },
      });
      if (!platformUser) {
        throw new UnauthorizedException('User not found');
      }
      if (!(await bcrypt.compare(oldPassword, platformUser.passwordHash))) {
        throw new BadRequestException('Old password is incorrect');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.platformUserRepository.update(userId, { passwordHash });
      return { message: 'Password changed successfully' };
    }

    await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const repo = manager.getRepository(TenantUser);
      const user = await repo.findOne({ where: { id: userId } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
        throw new BadRequestException('Old password is incorrect');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await repo.update(userId, { passwordHash });
    });
    return { message: 'Password changed successfully' };
  }
}

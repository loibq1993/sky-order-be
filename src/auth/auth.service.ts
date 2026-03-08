import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { getRootDomain, slugify } from '../utils/domain';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
      relations: ['restaurant'],
    });

    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Customer-only login (e.g. client app). Rejects super_admin and staff roles.
   */
  async loginAsCustomer(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.role !== 'customer') {
      throw new ForbiddenException('Use the admin login page for staff accounts');
    }
    return this.login(loginDto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    const updateData: Partial<User> = {
      lastLoginAt: new Date(),
    };
    if (loginDto.ip) {
      updateData.lastLoginIp = loginDto.ip;
    }
    await this.userRepository.update(user.id, updateData);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        restaurant: user.restaurant,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: {
        username: registerDto.username,
        restaurantId: registerDto.restaurantId ?? IsNull(),
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    // Check if email already exists
    if (registerDto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      username: registerDto.username,
      passwordHash,
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      role: registerDto.role || 'customer',
      restaurantId: registerDto.restaurantId,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Return user without password
    const { passwordHash: _, ...result } = savedUser;
    return result;
  }

  async createRestaurantOwner(restaurantData: any, userData: any) {
    // Create restaurant first
    const existingRestaurant = await this.restaurantRepository.findOne({
      where: { name: restaurantData.name },
    });
    if (existingRestaurant) {
      throw new BadRequestException('Restaurant name already exists');
    }

    // Dùng website làm domain riêng tenant nếu có (hostname, không protocol/path); không thì dùng customDomain hoặc generate subdomain
    const domainFromWebsite = restaurantData.website?.replace(/^https?:\/\//i, '').split('/')[0]?.trim();
    if (restaurantData.customDomain) {
      // giữ nguyên nếu đã gửi customDomain
    } else if (domainFromWebsite) {
      restaurantData.customDomain = domainFromWebsite;
    } else {
      restaurantData.customDomain = await this.generateUniqueSubdomain(restaurantData.name);
    }

    const restaurant = this.restaurantRepository.create(restaurantData);
    const savedRestaurant = await this.restaurantRepository.save(restaurant) as unknown as Restaurant;

    // Ensure username is unique within this restaurant
    const existingOwner = await this.userRepository.findOne({
      where: {
        username: userData.username,
        restaurantId: savedRestaurant.id,
      },
    });
    if (existingOwner) {
      throw new BadRequestException('Username already exists');
    }

    if (userData.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: userData.email },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Create restaurant owner
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const user = this.userRepository.create({
      username: userData.username,
      passwordHash,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: 'restaurant_owner',
      restaurantId: savedRestaurant.id,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      restaurant: savedRestaurant,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        restaurant: savedRestaurant,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  private async generateUniqueSubdomain(name: string): Promise<string | undefined> {
    const rootDomain = getRootDomain();
    if (!rootDomain) {
      return undefined;
    }
    const base = slugify(name || 'restaurant');
    let candidate = `${base}.${rootDomain}`;
    let counter = 1;

    while (await this.restaurantRepository.findOne({ where: { customDomain: candidate } })) {
      counter += 1;
      candidate = `${base}-${counter}.${rootDomain}`;
    }

    return candidate;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(userId, { passwordHash });
    return { message: 'Password changed successfully' };
  }
}

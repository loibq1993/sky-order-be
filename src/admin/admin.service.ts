import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';
import { Table } from '../entities/table.entity';
import { getRootDomain, slugify } from '../utils/domain';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  // Restaurant Management
  async createRestaurant(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const existingRestaurant = await this.restaurantRepository.findOne({
      where: { name: createRestaurantDto.name },
    });
    if (existingRestaurant) {
      throw new BadRequestException('Restaurant name already exists');
    }

    const domainFromWebsite = createRestaurantDto.website?.replace(/^https?:\/\//i, '').split('/')[0]?.trim();
    if (createRestaurantDto.customDomain) {
      // giữ nguyên nếu đã gửi customDomain
    } else if (domainFromWebsite) {
      createRestaurantDto.customDomain = domainFromWebsite;
    } else {
      createRestaurantDto.customDomain = await this.generateUniqueSubdomain(createRestaurantDto.name);
    }

    const restaurant = this.restaurantRepository.create(createRestaurantDto);
    return this.restaurantRepository.save(restaurant);
  }

  async findAllRestaurants(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.restaurantRepository.createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.users', 'users')
      .where('restaurant.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere(
        '(restaurant.name LIKE :search OR restaurant.email LIKE :search OR restaurant.phone LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [restaurants, total] = await queryBuilder
      .orderBy('restaurant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      restaurants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRestaurantById(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['users', 'categories', 'products', 'tables'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async findRestaurantPublicById(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async findRestaurantByDomain(domain: string): Promise<Restaurant | null> {
    let restaurant = await this.restaurantRepository.findOne({
      where: { customDomain: domain, deletedAt: IsNull() },
    });
    if (!restaurant) {
      restaurant = await this.restaurantRepository.findOne({
        where: { website: domain, deletedAt: IsNull() },
      });
    }
    return restaurant || null;
  }

  async updateRestaurant(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.findRestaurantById(id);
    
    Object.assign(restaurant, updateRestaurantDto);
    return this.restaurantRepository.save(restaurant);
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

  async deleteRestaurant(id: string): Promise<void> {
    const restaurant = await this.findRestaurantById(id);
    await this.restaurantRepository.softDelete(id);
  }

  async getRestaurantStats(id: string) {
    const restaurant = await this.findRestaurantById(id);
    
    const [
      totalCategories,
      totalProducts,
      totalTables,
      totalOrders,
      totalUsers,
    ] = await Promise.all([
      this.categoryRepository.count({ where: { restaurantId: id } }),
      this.productRepository.count({ where: { restaurantId: id } }),
      this.tableRepository.count({ where: { restaurantId: id } }),
      this.orderRepository.count({ where: { restaurantId: id } }),
      this.userRepository.count({ where: { restaurantId: id } }),
    ]);

    return {
      restaurant,
      stats: {
        totalCategories,
        totalProducts,
        totalTables,
        totalOrders,
        totalUsers,
      },
    };
  }

  // User Management
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: {
        username: createUserDto.username,
        restaurantId: createUserDto.restaurantId ?? IsNull(),
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    // Check if email already exists
    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAllUsers(page: number = 1, limit: number = 10, search?: string, restaurantId?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.restaurant', 'restaurant')
      .where('user.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (restaurantId) {
      queryBuilder.andWhere('user.restaurantId = :restaurantId', { restaurantId });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findUserById(id);
    
    // Check if username already exists (excluding current user)
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }
    }

    // Check if email already exists (excluding current user)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findUserById(id);
    await this.userRepository.softDelete(id);
  }

  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.findUserById(id);
    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }

  // System Statistics
  async getSystemStats() {
    const [
      totalRestaurants,
      totalUsers,
      totalCategories,
      totalProducts,
      totalTables,
      totalOrders,
      activeRestaurants,
      activeUsers,
    ] = await Promise.all([
      this.restaurantRepository.count({ where: { deletedAt: IsNull() } }),
      this.userRepository.count({ where: { deletedAt: IsNull() } }),
      this.categoryRepository.count({ where: { deletedAt: IsNull() } }),
      this.productRepository.count({ where: { deletedAt: IsNull() } }),
      this.tableRepository.count({ where: { deletedAt: IsNull() } }),
      this.orderRepository.count({ where: { deletedAt: IsNull() } }),
      this.restaurantRepository.count({ where: { isActive: true, deletedAt: IsNull() } }),
      this.userRepository.count({ where: { isActive: true, deletedAt: IsNull() } }),
    ]);

    return {
      totalRestaurants,
      totalUsers,
      totalCategories,
      totalProducts,
      totalTables,
      totalOrders,
      activeRestaurants,
      activeUsers,
    };
  }
}

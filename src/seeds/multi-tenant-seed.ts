import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { Table } from '../entities/table.entity';

export class MultiTenantSeed {
  constructor(private dataSource: DataSource) {}

  async run() {

    // Create restaurants
    const restaurants = await this.createRestaurants();

    // Create users for each restaurant
    const users = await this.createUsers(restaurants);

    // Skip auto-seeding categories, products, and tables for new restaurants

    if (restaurants.length > 0) {
    }
  }

  private async createRestaurants(): Promise<Restaurant[]> {
    const restaurantRepository = this.dataSource.getRepository(Restaurant);

    // Check if restaurant already exists
    const existingRestaurant = await restaurantRepository.findOne({
      where: { name: 'Sky Order Restaurant' },
    });

    if (existingRestaurant) {
      return [existingRestaurant];
    }

    const restaurantData = {
      name: 'Sky Order Restaurant',
      nameKo: '스카이 오더 레스토랑',
      description: 'Sky Order Restaurant - Vietnamese cuisine',
      descriptionKo: '스카이 오더 레스토랑 - 베트남 요리',
      address: '123 Main Street, Ho Chi Minh City',
      phone: '+84 28 1234 5678',
      email: 'info@skyorder.com',
      customDomain: 'skyorder.com',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND',
      language: 'vi',
      isActive: true,
      settings: {
        taxRate: 0.1,
        serviceCharge: 0.05,
        deliveryFee: 15000,
        minOrderAmount: 50000,
      },
    };

    const restaurant = restaurantRepository.create(restaurantData);
    const savedRestaurant = await restaurantRepository.save(restaurant);
    return [savedRestaurant];
  }

  private async createUsers(restaurants: Restaurant[]): Promise<User[]> {
    const userRepository = this.dataSource.getRepository(User);
    const users: User[] = [];

    // Create superadmin - can control every restaurant (no restaurantId)
    const existingSuperAdmin = await userRepository.findOne({
      where: { username: 'superadmin' },
    });

    if (!existingSuperAdmin) {
      const superAdminPassword = await bcrypt.hash('admin123', 10);
      const superAdmin = userRepository.create({
        username: 'superadmin',
        passwordHash: superAdminPassword,
        email: 'superadmin@skyorder.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        restaurantId: null, // No restaurantId - can control all restaurants
        isActive: true,
      });
      const savedSuperAdmin = await userRepository.save(superAdmin);
      users.push(savedSuperAdmin);
    } else {
      users.push(existingSuperAdmin);
    }

    // Create admin - can control single restaurant (has restaurantId)
    if (restaurants.length > 0) {
      const restaurant = restaurants[0];
      const existingAdmin = await userRepository.findOne({
        where: { username: 'admin' },
      });

      if (!existingAdmin) {
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = userRepository.create({
          username: 'admin',
          passwordHash: adminPassword,
          email: 'admin@skyorder.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'restaurant_owner', // restaurant_owner role can control single restaurant
          restaurantId: restaurant.id, // Has restaurantId - can control this restaurant only
          isActive: true,
        });
        const savedAdmin = await userRepository.save(admin);
        users.push(savedAdmin);
      } else {
        users.push(existingAdmin);
      }
    }

    return users;
  }

  private async createCategories(restaurants: Restaurant[]): Promise<Category[]> {
    const categoryRepository = this.dataSource.getRepository(Category);
    const categories: Category[] = [];

    const categoryData = [
      { name: 'Popular', nameKo: '인기', icon: '🔥', description: 'Most popular items', descriptionKo: '가장 인기 있는 메뉴' },
      { name: 'Pho', nameKo: '포', icon: '🍜', description: 'Traditional Vietnamese noodle soup', descriptionKo: '전통 베트남 국수' },
      { name: 'Banh Mi', nameKo: '반미', icon: '🥖', description: 'Vietnamese sandwiches', descriptionKo: '베트남 샌드위치' },
      { name: 'Rice Dishes', nameKo: '라이스 요리', icon: '🍚', description: 'Rice-based dishes', descriptionKo: '쌀 요리' },
      { name: 'Noodles', nameKo: '면요리', icon: '🍝', description: 'Noodle dishes', descriptionKo: '면 요리' },
      { name: 'Appetizers', nameKo: '전채', icon: '🥗', description: 'Starters and appetizers', descriptionKo: '전채 요리' },
      { name: 'Beverages', nameKo: '음료', icon: '🥤', description: 'Drinks and beverages', descriptionKo: '음료' },
      { name: 'Desserts', nameKo: '디저트', icon: '🍮', description: 'Sweet treats', descriptionKo: '달콤한 디저트' },
    ];

    for (const restaurant of restaurants) {
      for (const data of categoryData) {
        const category = categoryRepository.create({
          ...data,
          restaurantId: restaurant.id,
        });
        categories.push(await categoryRepository.save(category));
      }
    }

    return categories;
  }

  private async createProducts(restaurants: Restaurant[], categories: Category[]): Promise<Product[]> {
    const productRepository = this.dataSource.getRepository(Product);
    const products: Product[] = [];

    const productData = [
      // Pho dishes
      { name: 'Pho Bo', nameKo: '포 보', price: 65000, category: 'Pho', description: 'Beef pho with fresh herbs' },
      { name: 'Pho Ga', nameKo: '포 가', price: 60000, category: 'Pho', description: 'Chicken pho with fresh herbs' },
      { name: 'Pho Tai', nameKo: '포 타이', price: 70000, category: 'Pho', description: 'Rare beef pho' },
      
      // Banh Mi
      { name: 'Banh Mi Thit Nuong', nameKo: '반미 티트 누옹', price: 35000, category: 'Banh Mi', description: 'Grilled pork banh mi' },
      { name: 'Banh Mi Ga', nameKo: '반미 가', price: 30000, category: 'Banh Mi', description: 'Chicken banh mi' },
      { name: 'Banh Mi Chay', nameKo: '반미 차이', price: 25000, category: 'Banh Mi', description: 'Vegetarian banh mi' },
      
      // Rice dishes
      { name: 'Com Tam', nameKo: '콤 탐', price: 45000, category: 'Rice Dishes', description: 'Broken rice with grilled pork' },
      { name: 'Com Ga', nameKo: '콤 가', price: 40000, category: 'Rice Dishes', description: 'Chicken rice' },
      { name: 'Com Suon', nameKo: '콤 수온', price: 50000, category: 'Rice Dishes', description: 'Pork chop rice' },
      
      // Noodles
      { name: 'Bun Bo Hue', nameKo: '분 보 후에', price: 55000, category: 'Noodles', description: 'Spicy beef noodle soup' },
      { name: 'Bun Thit Nuong', nameKo: '분 티트 누옹', price: 45000, category: 'Noodles', description: 'Grilled pork vermicelli' },
      { name: 'Mi Quang', nameKo: '미 꽝', price: 50000, category: 'Noodles', description: 'Quang noodles' },
      
      // Appetizers
      { name: 'Goi Cuon', nameKo: '고이 쿠온', price: 25000, category: 'Appetizers', description: 'Fresh spring rolls' },
      { name: 'Cha Gio', nameKo: '차 지오', price: 30000, category: 'Appetizers', description: 'Fried spring rolls' },
      { name: 'Banh Xeo', nameKo: '반 세오', price: 40000, category: 'Appetizers', description: 'Vietnamese pancake' },
      
      // Beverages
      { name: 'Ca Phe Sua Da', nameKo: '카 페 수아 다', price: 15000, category: 'Beverages', description: 'Vietnamese iced coffee' },
      { name: 'Tra Da', nameKo: '트라 다', price: 10000, category: 'Beverages', description: 'Iced tea' },
      { name: 'Nuoc Dua', nameKo: '누옥 두아', price: 20000, category: 'Beverages', description: 'Fresh coconut water' },
      
      // Desserts
      { name: 'Che Ba Mau', nameKo: '체 바 마우', price: 20000, category: 'Desserts', description: 'Three color dessert' },
      { name: 'Banh Flan', nameKo: '반 플란', price: 25000, category: 'Desserts', description: 'Vietnamese flan' },
      { name: 'Kem', nameKo: '켐', price: 15000, category: 'Desserts', description: 'Ice cream' },
    ];

    for (const restaurant of restaurants) {
      const restaurantCategories = categories.filter(cat => cat.restaurantId === restaurant.id);
      
      for (const data of productData) {
        const category = restaurantCategories.find(cat => cat.name === data.category);
        if (category) {
          const product = productRepository.create({
            name: data.name,
            nameKo: data.nameKo,
            price: data.price,
            description: data.description,
            descriptionKo: data.description,
            categoryId: category.id,
            category: category.name,
            categoryKo: category.nameKo,
            restaurantId: restaurant.id,
            available: true,
            visible: true,
          });
          products.push(await productRepository.save(product));
        }
      }
    }

    return products;
  }

  private async createTables(restaurants: Restaurant[]): Promise<Table[]> {
    const tableRepository = this.dataSource.getRepository(Table);
    const tables: Table[] = [];

    for (const restaurant of restaurants) {
      // Create 10 tables for each restaurant
      for (let i = 1; i <= 10; i++) {
        const table = tableRepository.create({
          name: `Table ${i}`,
          tableNumber: i,
          capacity: i <= 4 ? 2 : i <= 7 ? 4 : 6,
          description: `Table for ${i <= 4 ? 2 : i <= 7 ? 4 : 6} people`,
          restaurantId: restaurant.id,
          status: 'available',
          isActive: true,
        });
        tables.push(await tableRepository.save(table));
      }
    }

    return tables;
  }
}

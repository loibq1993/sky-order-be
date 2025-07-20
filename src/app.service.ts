import { Injectable } from '@nestjs/common';
import { Category, MenuItem } from './types';

@Injectable()
export class AppService {
  private categories: Category[] = [
    {
      id: '2',
      name: 'Chè',
      icon: '🍮',
      description: 'Vietnamese sweet soups',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Sữa Chua',
      icon: '🥛',
      description: 'Yogurt-based desserts',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      name: 'Caramen',
      icon: '🍮',
      description: 'Caramel desserts',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      name: 'Matcha',
      icon: '🍵',
      description: 'Green tea items',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '6',
      name: 'Khác',
      icon: '🍰',
      description: 'Other items',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private menuItems: MenuItem[] = [
    {
      id: '1',
      name: 'RAU CÂU LÁ NẾP CARAMEN',
      addName: 'RAU CÂU LÁ NẾP CARAMEN',
      price: 24000,
      description: 'Rau câu lá nếp thơm ngon với caramen đậm đà',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '4',
      category: 'Caramen',
      available: true,
      sales: 45,
      statusKey: 'menu-item-status',
      count: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Bánh Caramen Truyền Thống',
      addName: 'Bánh Caramen Truyền Thống',
      price: 8000,
      description: 'Bánh caramen theo công thức truyền thống',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '4',
      category: 'Caramen',
      available: true,
      sales: 67,
      statusKey: 'menu-item-status',
      count: 67,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'CHÈ SẦU RIÊNG ĐẶC BIỆT',
      addName: 'CHÈ SẦU RIÊNG ĐẶC BIỆT',
      price: 35000,
      description: 'Chè sầu riêng với topping đặc biệt',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '2',
      category: 'Chè',
      available: true,
      sales: 23,
      statusKey: 'menu-item-status',
      count: 23,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      name: 'SỮA CHUA NẾP MÍT CARAMEN',
      addName: 'SỮA CHUA NẾP MÍT CARAMEN',
      price: 30000,
      description: 'Sữa chua nếp mít với caramen thơm ngon',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '3',
      category: 'Sữa Chua',
      available: true,
      sales: 34,
      statusKey: 'menu-item-status',
      count: 34,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      name: 'SỮA CHUA MÍT TRÂN CHÂU',
      addName: 'SỮA CHUA MÍT TRÂN CHÂU',
      price: 22000,
      description: 'Sữa chua mít với trân châu dai ngon',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '3',
      category: 'Sữa Chua',
      available: true,
      sales: 56,
      statusKey: 'menu-item-status',
      count: 56,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '6',
      name: 'MATCHA TRỘN CARAMEN MATCHA',
      addName: 'MATCHA TRỘN CARAMEN MATCHA',
      price: 24000,
      description: 'Matcha trộn caramen đậm đà hương vị',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '5',
      category: 'Matcha',
      available: true,
      sales: 29,
      statusKey: 'menu-item-status',
      count: 29,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '7',
      name: 'RAU CÂU SỮA DỪA CARAMEN',
      addName: 'RAU CÂU SỮA DỪA CARAMEN',
      price: 24000,
      description: 'Rau câu sữa dừa với caramen thơm ngon',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '4',
      category: 'Caramen',
      available: true,
      sales: 38,
      statusKey: 'menu-item-status',
      count: 38,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '8',
      name: 'CHÈ TÀU HŨ CARAMEN',
      addName: 'CHÈ TÀU HŨ CARAMEN',
      price: 25000,
      description: 'Chè tàu hũ với caramen đặc biệt',
      image: 'https://down-vn.img.susercontent.com/vn-11134259-7r98o-lwdkekx8e5zv19@resize_ss640x400',
      categoryId: '2',
      category: 'Chè',
      available: true,
      sales: 41,
      statusKey: 'menu-item-status',
      count: 41,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Category methods
  getCategories(): { categories: Category[] } {
    return { categories: this.categories.filter(cat => cat.isActive) };
  }

  createCategory(categoryData: Partial<Category>): Category {
    if (!categoryData.name || !categoryData.icon) {
      throw new Error('Name and icon are required');
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name: categoryData.name,
      icon: categoryData.icon,
      description: categoryData.description,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.categories.push(newCategory);
    return newCategory;
  }

  updateCategory(id: string, categoryData: Partial<Category>): Category {
    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    this.categories[categoryIndex] = {
      ...this.categories[categoryIndex],
      ...categoryData,
      updatedAt: new Date(),
    };

    return this.categories[categoryIndex];
  }

  deleteCategory(id: string): { message: string } {
    const categoryIndex = this.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    // Check if category has menu items
    const hasMenuItems = this.menuItems.some(item => item.categoryId === id);
    if (hasMenuItems) {
      throw new Error('Cannot delete category with existing menu items');
    }

    this.categories[categoryIndex].isActive = false;
    return { message: 'Category deleted successfully' };
  }

  // Menu methods
  getMenu(): { menu: MenuItem[] } {
    return { menu: this.menuItems.filter(item => item.available) };
  }

  getMenuByCategory(categoryId: string): { menu: MenuItem[] } {
    const filteredMenu = this.menuItems.filter(
      item => item.categoryId === categoryId && item.available
    );
    return { menu: filteredMenu };
  }

  createMenuItem(menuData: Partial<MenuItem>): MenuItem {
    if (!menuData.name || !menuData.price || !menuData.description || !menuData.image || !menuData.categoryId || !menuData.category) {
      throw new Error('Name, price, description, image, categoryId, and category are required');
    }

    const newMenuItem: MenuItem = {
      id: Date.now().toString(),
      name: menuData.name,
      addName: menuData.addName || menuData.name,
      price: menuData.price,
      description: menuData.description,
      image: menuData.image,
      categoryId: menuData.categoryId,
      category: menuData.category,
      available: true,
      sales: 0,
      statusKey: 'menu-item-status',
      count: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.menuItems.push(newMenuItem);
    return newMenuItem;
  }

  updateMenuItem(id: string, menuData: Partial<MenuItem>): MenuItem {
    const menuIndex = this.menuItems.findIndex(item => item.id === id);
    if (menuIndex === -1) {
      throw new Error('Menu item not found');
    }

    this.menuItems[menuIndex] = {
      ...this.menuItems[menuIndex],
      ...menuData,
      updatedAt: new Date(),
    };

    return this.menuItems[menuIndex];
  }

  deleteMenuItem(id: string): { message: string } {
    const menuIndex = this.menuItems.findIndex(item => item.id === id);
    if (menuIndex === -1) {
      throw new Error('Menu item not found');
    }

    this.menuItems[menuIndex].available = false;
    return { message: 'Menu item deleted successfully' };
  }
}

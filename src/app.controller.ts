import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Category, MenuItem } from './types';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('menu')
  getMenu(): { menu: MenuItem[] } {
    return this.appService.getMenu();
  }

  @Get('categories')
  getCategories(): { categories: Category[] } {
    return this.appService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() categoryData: Partial<Category>): Category {
    return this.appService.createCategory(categoryData);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() categoryData: Partial<Category>): Category {
    return this.appService.updateCategory(id, categoryData);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string): { message: string } {
    return this.appService.deleteCategory(id);
  }

  @Post('menu')
  createMenuItem(@Body() menuData: Partial<MenuItem>): MenuItem {
    return this.appService.createMenuItem(menuData);
  }

  @Put('menu/:id')
  updateMenuItem(@Param('id') id: string, @Body() menuData: Partial<MenuItem>): MenuItem {
    return this.appService.updateMenuItem(id, menuData);
  }

  @Delete('menu/:id')
  deleteMenuItem(@Param('id') id: string): { message: string } {
    return this.appService.deleteMenuItem(id);
  }

  @Get('menu/category/:categoryId')
  getMenuByCategory(@Param('categoryId') categoryId: string): { menu: MenuItem[] } {
    return this.appService.getMenuByCategory(categoryId);
  }
}

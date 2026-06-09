import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    ClassSerializerInterceptor,
    HttpCode,
    HttpStatus,
    UseGuards,
    Request
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiBearerAuth
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './categories.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { TENANT_MENU_READ_ROLES } from '../auth/roles.constants';

@ApiTags('admin-categories')
@Controller('admin/categories')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class AdminCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new category' })
    @ApiBody({ type: CreateCategoryDto })
    @ApiResponse({
        status: 201,
        description: 'Category created successfully',
        type: CategoryResponseDto
    })
    async create(@Body() createCategoryDto: CreateCategoryDto, @RestaurantId() restaurantId: string): Promise<CategoryResponseDto> {
        return this.categoriesService.create(createCategoryDto, restaurantId);
    }

    @Get()
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get all categories' })
    @ApiResponse({
        status: 200,
        description: 'Categories retrieved successfully',
        type: [CategoryResponseDto]
    })
    async findAll(@RestaurantId() restaurantId: string): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll(restaurantId);
    }

    @Get(':id')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get category by ID' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category retrieved successfully',
        type: CategoryResponseDto
    })
    async findOne(@Param('id') id: string, @RestaurantId() restaurantId: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id, restaurantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiBody({ type: UpdateCategoryDto })
    @ApiResponse({
        status: 200,
        description: 'Category updated successfully',
        type: CategoryResponseDto
    })
    async update(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @RestaurantId() restaurantId: string
    ): Promise<CategoryResponseDto> {
        return this.categoriesService.update(id, updateCategoryDto, restaurantId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category deleted successfully'
    })
    async remove(@Param('id') id: string, @RestaurantId() restaurantId: string): Promise<{ message: string }> {
        return this.categoriesService.remove(id, restaurantId);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({ summary: 'Toggle category active status' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category status toggled successfully',
        type: CategoryResponseDto
    })
    async toggleActive(@Param('id') id: string, @RestaurantId() restaurantId: string): Promise<CategoryResponseDto> {
        return this.categoriesService.toggleActive(id, restaurantId);
    }
} 
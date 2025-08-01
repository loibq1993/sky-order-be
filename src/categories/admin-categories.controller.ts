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
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './categories.dto';

@ApiTags('admin-categories')
@Controller('admin/categories')
@UseInterceptors(ClassSerializerInterceptor)
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
    async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all categories' })
    @ApiResponse({
        status: 200,
        description: 'Categories retrieved successfully',
        type: [CategoryResponseDto]
    })
    async findAll(): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category retrieved successfully',
        type: CategoryResponseDto
    })
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id);
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
        @Body() updateCategoryDto: UpdateCategoryDto
    ): Promise<CategoryResponseDto> {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category deleted successfully'
    })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
        return this.categoriesService.remove(id);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({ summary: 'Toggle category active status' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({
        status: 200,
        description: 'Category status toggled successfully',
        type: CategoryResponseDto
    })
    async toggleActive(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.toggleActive(id);
    }
} 
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
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
    ApiQuery,
    ApiBody
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './categories.dto';

@ApiTags('categories-admin')
@Controller('admin/categories')
@UseInterceptors(ClassSerializerInterceptor)
export class AdminCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new category (Admin)' })
    @ApiBody({ type: CreateCategoryDto })
    @ApiResponse({
        status: 201,
        description: 'Category created successfully',
        type: CategoryResponseDto
    })
    @ApiResponse({ status: 400, description: 'Bad request - validation error' })
    async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all categories (Admin) - includes deleted' })
    @ApiQuery({
        name: 'includeDeleted',
        required: false,
        description: 'Include soft deleted categories',
        type: Boolean
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number (default: 1)',
        type: Number
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of categories per page (default: 10)',
        type: Number
    })
    @ApiResponse({
        status: 200,
        description: 'Categories retrieved successfully',
        type: [CategoryResponseDto]
    })
    async findAll(
        @Query('includeDeleted') includeDeleted?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ): Promise<CategoryResponseDto[] | {
        categories: CategoryResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        if (pageNumber > 1 || limitNumber !== 10) {
            // Use pagination
            return this.categoriesService.findAllPaginated(pageNumber, limitNumber, includeDeleted === 'true');
        }

        // Use regular findAll for backward compatibility
        if (includeDeleted === 'true') {
            return this.categoriesService.findAllWithDeleted();
        }
        return this.categoriesService.findAll();
    }

    @Get('with-count')
    @ApiOperation({ summary: 'Get all categories with menu count (Admin)' })
    async findAllWithMenuCount(): Promise<(CategoryResponseDto & { menuCount: number })[]> {
        return this.categoriesService.findWithMenuCount();
    }

    @Get('search')
    @ApiOperation({ summary: 'Search categories (Admin)' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    async search(@Query('q') query: string): Promise<CategoryResponseDto[]> {
        if (!query) {
            return this.categoriesService.findAll();
        }
        return this.categoriesService.search(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id);
    }

    @Get(':id/with-products')
    @ApiOperation({ summary: 'Get category by ID with product count (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async findOneWithProducts(@Param('id') id: string): Promise<CategoryResponseDto & { productCount: number }> {
        return this.categoriesService.findOneWithProductCount(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update category (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiBody({ type: UpdateCategoryDto })
    async update(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto
    ): Promise<CategoryResponseDto> {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft delete category (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
        return this.categoriesService.remove(id);
    }

    @Post(':id/restore')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Restore soft deleted category (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async restore(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoriesService.restore(id);
    }

    @Delete(':id/permanent')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Permanently delete category (Admin)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
        return this.categoriesService.hardDelete(id);
    }
} 
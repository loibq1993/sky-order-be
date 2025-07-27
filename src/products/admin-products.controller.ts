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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './products.dto';

@ApiTags('products-admin')
@Controller('admin/products')
@UseInterceptors(ClassSerializerInterceptor)
export class AdminProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new product (Admin)' })
    @ApiBody({ type: CreateProductDto })
    @ApiResponse({
        status: 201,
        description: 'Product created successfully',
        type: ProductResponseDto
    })
    @ApiResponse({ status: 400, description: 'Bad request - validation error' })
    async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
        const { tempImageFilename, ...productData } = createProductDto as any;
        return this.productsService.create(productData, tempImageFilename);
    }

    @Get()
    @ApiOperation({ summary: 'Get all products with pagination (Admin) - includes hidden and unavailable' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of products per page (default: 10)' })
    @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
    @ApiQuery({
        name: 'includeDeleted',
        required: false,
        description: 'Include soft deleted products',
        type: Boolean
    })
    @ApiResponse({
        status: 200,
        description: 'Products retrieved successfully with pagination info'
    })
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('categoryId') categoryId?: string,
        @Query('includeDeleted') includeDeleted?: string
    ): Promise<{
        products: ProductResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        if (includeDeleted === 'true') {
            return this.productsService.findAllForAdminPaginated(pageNumber, limitNumber, true, categoryId);
        }
        return this.productsService.findAllForAdminPaginated(pageNumber, limitNumber, false, categoryId);
    }

    @Get('category/:categoryId')
    @ApiOperation({ summary: 'Get products by category (Admin)' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    async findByCategory(@Param('categoryId') categoryId: string): Promise<ProductResponseDto[]> {
        return this.productsService.findByCategoryForAdmin(categoryId);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search products (Admin)' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    async search(@Query('q') query: string): Promise<ProductResponseDto[]> {
        if (!query) {
            return this.productsService.findAllForAdmin();
        }
        return this.productsService.searchForAdmin(query);
    }

    @Get('popular')
    @ApiOperation({ summary: 'Get popular products (Admin)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of products to return' })
    async getPopular(@Query('limit') limit?: string): Promise<ProductResponseDto[]> {
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.productsService.getPopularForAdmin(limitNumber);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBody({ type: UpdateProductDto })
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto
    ): Promise<ProductResponseDto> {
        // Extract tempImageFilename from the request body if it exists
        const { tempImageFilename, ...productData } = updateProductDto as any;
        return this.productsService.update(id, productData, tempImageFilename);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft delete product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
        return this.productsService.remove(id);
    }

    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restore soft deleted product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async restore(@Param('id') id: string): Promise<ProductResponseDto> {
        return this.productsService.restore(id);
    }

    @Delete(':id/hard')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Permanently delete product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async hardDelete(@Param('id') id: string): Promise<{ message: string }> {
        return this.productsService.hardDelete(id);
    }

    @Patch(':id/sales')
    @ApiOperation({ summary: 'Update product sales (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async updateSales(
        @Param('id') id: string,
        @Body() body: { sales: number }
    ): Promise<ProductResponseDto> {
        return this.productsService.updateSales(id, body.sales);
    }

    @Patch(':id/sales/increment')
    @ApiOperation({ summary: 'Increment product sales (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async incrementSales(
        @Param('id') id: string,
        @Body() body: { increment?: number }
    ): Promise<ProductResponseDto> {
        return this.productsService.incrementSales(id, body.increment || 1);
    }

    @Patch(':id/visibility')
    @ApiOperation({ summary: 'Toggle product visibility (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async toggleVisibility(@Param('id') id: string): Promise<ProductResponseDto> {
        return this.productsService.toggleVisibility(id);
    }

    @Patch(':id/availability')
    @ApiOperation({ summary: 'Toggle product availability (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async toggleAvailability(@Param('id') id: string): Promise<ProductResponseDto> {
        return this.productsService.toggleAvailability(id);
    }
} 
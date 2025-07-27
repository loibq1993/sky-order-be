import {
    Controller,
    Get,
    Param,
    Query,
    UseInterceptors,
    ClassSerializerInterceptor
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductResponseDto } from './products.dto';

@ApiTags('products-client')
@Controller('products')
@UseInterceptors(ClassSerializerInterceptor)
export class ClientProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all visible and available products with pagination and category filter (Client)' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of products per page (default: 10)' })
    @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
    @ApiResponse({
        status: 200,
        description: 'Products retrieved successfully with pagination info'
    })
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('categoryId') categoryId?: string
    ): Promise<{
        products: ProductResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.productsService.findAllPaginated(pageNumber, limitNumber, categoryId);
    }

    @Get('category/:categoryId')
    @ApiOperation({ summary: 'Get products by category (Client)' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    async findByCategory(@Param('categoryId') categoryId: string): Promise<ProductResponseDto[]> {
        return this.productsService.findByCategory(categoryId);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search products (Client)' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    async search(@Query('q') query: string): Promise<ProductResponseDto[]> {
        if (!query) {
            return this.productsService.findAll();
        }
        return this.productsService.search(query);
    }

    @Get('popular')
    @ApiOperation({ summary: 'Get popular products (Client)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of products to return' })
    async getPopular(@Query('limit') limit?: string): Promise<ProductResponseDto[]> {
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.productsService.getPopular(limitNumber);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID (Client)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
        return this.productsService.findOne(id);
    }
} 
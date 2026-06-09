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
    HttpStatus,
    UseGuards
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody,
    ApiBearerAuth
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { TENANT_MENU_READ_ROLES } from '../auth/roles.constants';

@ApiTags('products-admin')
@Controller('admin/products')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
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
    async create(
        @Body() createProductDto: CreateProductDto,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        const { tempImageFilename, ...productData } = createProductDto as any;
        return this.productsService.create(productData, tempImageFilename, restaurantId);
    }

    @Get()
    @Roles(...TENANT_MENU_READ_ROLES)
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
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Tìm theo tên / tên Hàn / mô tả (không phân biệt hoa thường)',
    })
    @ApiQuery({
        name: 'available',
        required: false,
        description: 'Lọc còn hàng (true) hoặc hết hàng (false)',
        type: Boolean,
    })
    @ApiQuery({
        name: 'sortBy',
        required: false,
        description: 'Sắp xếp: created | updated | sales',
        enum: ['created', 'updated', 'sales'],
    })
    @ApiQuery({
        name: 'sortOrder',
        required: false,
        description: 'ASC hoặc DESC (mặc định DESC)',
        enum: ['ASC', 'DESC'],
    })
    @ApiResponse({
        status: 200,
        description: 'Products retrieved successfully with pagination info'
    })
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('categoryId') categoryId?: string,
        @Query('includeDeleted') includeDeleted?: string,
        @Query('search') search?: string,
        @Query('available') available?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: string,
        @RestaurantId() restaurantId?: string
    ): Promise<{
        products: ProductResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const pageNumber = page ? parseInt(page, 10) : 1;
        const limitNumber = limit ? parseInt(limit, 10) : 10;

        let availableFilter: boolean | undefined;
        if (available === 'true') availableFilter = true;
        else if (available === 'false') availableFilter = false;

        const sortRaw = (sortBy || 'updated').toLowerCase();
        const sortByNorm: 'created' | 'updated' | 'sales' =
            sortRaw === 'created' || sortRaw === 'sales' ? sortRaw : 'updated';
        const sortOrderNorm: 'ASC' | 'DESC' =
            (sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        if (includeDeleted === 'true') {
            return this.productsService.findAllForAdminPaginated(
                pageNumber,
                limitNumber,
                true,
                categoryId,
                restaurantId,
                search,
                availableFilter,
                sortByNorm,
                sortOrderNorm,
            );
        }
        return this.productsService.findAllForAdminPaginated(
            pageNumber,
            limitNumber,
            false,
            categoryId,
            restaurantId,
            search,
            availableFilter,
            sortByNorm,
            sortOrderNorm,
        );
    }

    @Get('category/:categoryId')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get products by category (Admin)' })
    @ApiParam({ name: 'categoryId', description: 'Category ID' })
    async findByCategory(
        @Param('categoryId') categoryId: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto[]> {
        return this.productsService.findByCategoryForAdmin(categoryId, restaurantId);
    }

    @Get('search')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Search products (Admin)' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    async search(
        @Query('q') query: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto[]> {
        if (!query) {
            return this.productsService.findAllForAdmin(restaurantId);
        }
        return this.productsService.searchForAdmin(query, restaurantId);
    }

    @Get('popular')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get popular products (Admin)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of products to return' })
    async getPopular(
        @Query('limit') limit?: string,
        @RestaurantId() restaurantId?: string
    ): Promise<ProductResponseDto[]> {
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.productsService.getPopularForAdmin(limitNumber, restaurantId);
    }

    @Get('count/active')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get count of active products' })
    @ApiResponse({ status: 200, description: 'Returns count of active products' })
    async getActiveProductsCount(@RestaurantId() restaurantId: string) {
        const count = await this.productsService.getActiveProductsCount(restaurantId);
        return { count };
    }

    @Get(':id')
    @Roles(...TENANT_MENU_READ_ROLES)
    @ApiOperation({ summary: 'Get product by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async findOne(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.findOne(id, restaurantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBody({ type: UpdateProductDto })
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        // Extract tempImageFilename from the request body if it exists
        const { tempImageFilename, ...productData } = updateProductDto as any;
        return this.productsService.update(id, productData, tempImageFilename, restaurantId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft delete product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async remove(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<{ message: string }> {
        return this.productsService.remove(id, restaurantId);
    }

    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restore soft deleted product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async restore(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.restore(id, restaurantId);
    }

    @Delete(':id/hard')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Permanently delete product (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async hardDelete(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<{ message: string }> {
        return this.productsService.hardDelete(id, restaurantId);
    }

    @Patch(':id/sales')
    @ApiOperation({ summary: 'Update product sales (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async updateSales(
        @Param('id') id: string,
        @Body() body: { sales: number },
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.updateSales(id, body.sales, restaurantId);
    }

    @Patch(':id/sales/increment')
    @ApiOperation({ summary: 'Increment product sales (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async incrementSales(
        @Param('id') id: string,
        @Body() body: { increment?: number },
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.incrementSales(id, body.increment || 1, restaurantId);
    }

    @Patch(':id/visibility')
    @ApiOperation({ summary: 'Toggle product visibility (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async toggleVisibility(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.toggleVisibility(id, restaurantId);
    }

    @Patch(':id/availability')
    @ApiOperation({ summary: 'Toggle product availability (Admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    async toggleAvailability(
        @Param('id') id: string,
        @RestaurantId() restaurantId: string
    ): Promise<ProductResponseDto> {
        return this.productsService.toggleAvailability(id, restaurantId);
    }
} 
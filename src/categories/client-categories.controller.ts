import {
    Controller,
    Get,
    Param,
    UseGuards,
    UseInterceptors,
    ClassSerializerInterceptor
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './categories.dto';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { ResolveTenantFromDomainGuard } from '../auth/guards/resolve-tenant-from-domain.guard';

@ApiTags('categories-client')
@Controller('client/categories')
@UseGuards(ResolveTenantFromDomainGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ClientCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active categories (Client)' })
    @ApiResponse({
        status: 200,
        description: 'Categories retrieved successfully',
        type: [CategoryResponseDto]
    })
    async findAll(@RestaurantId() restaurantId: string): Promise<CategoryResponseDto[]> {
        return this.categoriesService.findAll(restaurantId);
    }

    @Get('with-count')
    @ApiOperation({ summary: 'Get all categories with menu count (Client)' })
    async findAllWithMenuCount(@RestaurantId() restaurantId: string): Promise<(CategoryResponseDto & { menuCount: number })[]> {
        return this.categoriesService.findWithMenuCount(restaurantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID (Client)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    async findOne(@Param('id') id: string, @RestaurantId() restaurantId: string): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(id, restaurantId);
    }
} 
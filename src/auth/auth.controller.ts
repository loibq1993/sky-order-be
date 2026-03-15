import { Controller, Post, Get, Body, UseGuards, Request, Patch, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ResolveTenantFromDomainGuard } from './guards/resolve-tenant-from-domain.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ResolveTenantFromDomainGuard)
  @ApiOperation({ summary: 'User login (admin/staff)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 401, description: 'Super admin must use platform URL' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    loginDto.ip = req.ip;
    (loginDto as any).tenantIdFromDomain = (req as any).restaurantIdFromDomain;
    (loginDto as any).hostForTenantResolution = req.headers?.['x-client-host'] ?? req.headers?.['x-tenant-domain'] ?? req.headers?.host;
    return this.authService.login(loginDto);
  }

  @Post('customer/login')
  @UseGuards(ResolveTenantFromDomainGuard)
  @ApiOperation({ summary: 'Customer login only (client app); rejects staff/super_admin' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Not a customer; use admin login' })
  async loginAsCustomer(@Body() loginDto: LoginDto, @Request() req) {
    loginDto.ip = req.ip;
    (loginDto as any).tenantIdFromDomain = (req as any).restaurantIdFromDomain;
    if (!loginDto.tenantId) {
      (loginDto as any).tenantId = (req as any).restaurantIdFromDomain;
    }
    (loginDto as any).hostForTenantResolution = req.headers?.['x-client-host'] ?? req.headers?.['x-tenant-domain'] ?? req.headers?.host;
    return this.authService.loginAsCustomer(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const user = await this.authService.getProfile(req.user.userId, req.user.restaurantId ?? null);
    if (!user) throw new UnauthorizedException();
    const { tenant, ...rest } = user;
    return { ...rest, restaurant: tenant ?? null };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.oldPassword,
      body.newPassword,
      req.user.restaurantId ?? null,
    );
  }

  @Post('create-restaurant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new restaurant with owner' })
  @ApiResponse({ status: 201, description: 'Restaurant and owner created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createRestaurant(
    @Body() body: {
      restaurant: {
        name: string;
        nameKo?: string;
        description?: string;
        descriptionKo?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        timezone?: string;
        currency?: string;
        language?: string;
        settings?: any;
      };
      owner: {
        username: string;
        password: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
    },
  ) {
    return this.authService.createRestaurantOwner(body.restaurant, body.owner);
  }
}

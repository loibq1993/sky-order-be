import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const RestaurantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // For superadmin, allow passing restaurantId via header to access specific restaurant
    // This allows superadmin to manage a specific restaurant's data
    if (user?.role === 'super_admin') {
      const restaurantId = request.headers['x-restaurant-id'] || request.headers['X-Restaurant-ID'];
      // If superadmin provides restaurantId in header, use it
      // Otherwise return undefined (which should be handled by services)
      return restaurantId || undefined;
    }
    
    // For authenticated users, get from user object
    if (user?.restaurantId) {
      return user.restaurantId;
    }
    
    // For client endpoints, allow query param or X-Restaurant-ID header
    const restaurantId =
      request.query?.restaurantId ||
      request.headers['x-restaurant-id'] ||
      request.headers['X-Restaurant-ID'];
    
    if (!restaurantId) {
      throw new UnauthorizedException('Restaurant context is required');
    }
    
    return restaurantId;
  },
);

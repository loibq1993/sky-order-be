import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const RestaurantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (user?.restaurantId) {
      return user.restaurantId;
    }

    let restaurantId: string | undefined = (request as any).restaurantIdFromDomain;
    if (!restaurantId && user?.role === 'super_admin') {
      const q = request.query?.restaurantId ?? request.query?.tenantId;
      if (q != null) {
        const s = String(q).trim();
        if (s !== '' && s !== 'undefined' && s !== 'null') restaurantId = s;
      }
    }
    if (restaurantId != null) {
      const s = String(restaurantId).trim();
      if (s === 'undefined' || s === 'null' || s === '') restaurantId = undefined;
      else restaurantId = s;
    }
    if (!restaurantId) {
      throw new UnauthorizedException(
        'Restaurant context is required. Send X-Tenant-Domain (e.g. host:port) or Origin/Referer from tenant domain.',
      );
    }
    return restaurantId;
  },
);

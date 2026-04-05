import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Express turns duplicate query keys into an array; `String(['a','a'])` is `a,a` (invalid UUID).
 * Also handles a single string that already contains comma-separated duplicates.
 */
function normalizeRestaurantId(value: unknown): string | undefined {
  if (value == null) return undefined;
  let raw: string;
  if (Array.isArray(value)) {
    const first = value.find((v) => v != null && String(v).trim() !== '');
    if (first == null) return undefined;
    raw = String(first).trim();
  } else {
    raw = String(value).trim();
  }
  if (raw === '' || raw === 'undefined' || raw === 'null') return undefined;
  const comma = raw.indexOf(',');
  if (comma !== -1) {
    const first = raw.slice(0, comma).trim();
    if (first) return first;
  }
  return raw;
}

export const RestaurantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    const fromJwt = user?.restaurantId != null ? normalizeRestaurantId(user.restaurantId) : undefined;
    if (fromJwt) {
      return fromJwt;
    }

    // Super admin: ?restaurantId= trên URL (chọn tenant) phải thắng domain (tránh nhầm tenant khi host trùng)
    if (user?.role === 'super_admin') {
      const qSuper = normalizeRestaurantId(
        request.query?.restaurantId ?? request.query?.tenantId,
      );
      if (qSuper) {
        return qSuper;
      }
    }

    let restaurantId: string | undefined = normalizeRestaurantId(
      (request as { restaurantIdFromDomain?: unknown }).restaurantIdFromDomain,
    );
    if (!restaurantId) {
      const q = normalizeRestaurantId(
        request.query?.restaurantId ?? request.query?.tenantId,
      );
      if (q) {
        if (!user) {
          // Client public / curl / Postman: không JWT, không domain — bắt buộc ?restaurantId=
          restaurantId = q;
        } else {
          const uid =
            user.restaurantId != null
              ? normalizeRestaurantId(user.restaurantId)
              : undefined;
          if (!uid) {
            // JWT không gắn tenant (vd. customer) — cho phép query
            restaurantId = q;
          } else if (uid === q) {
            restaurantId = q;
          }
          // JWT có tenant khác query: không override (fromJwt đã return trừ edge case)
        }
      }
    }
    if (restaurantId != null) {
      const s = String(restaurantId).trim();
      if (s === 'undefined' || s === 'null' || s === '') restaurantId = undefined;
      else restaurantId = s;
    }
    if (!restaurantId) {
      throw new UnauthorizedException(
        'Restaurant context is required. Send X-Tenant-Domain or Origin/Referer, Bearer JWT with restaurantId, or ?restaurantId= (or tenantId) for public client API.',
      );
    }
    return restaurantId;
  },
);

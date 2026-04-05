import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Nếu có `Authorization: Bearer`, verify JWT và gán `request.user` (cùng shape JwtStrategy).
 * Không có token hoặc token lỗi → bỏ qua (không throw) để khách dùng client API chỉ qua domain.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return true;
    }
    const token = authHeader.slice(7).trim();
    if (!token) return true;
    try {
      const secret =
        this.configService.get<string>('app.security.jwtSecret') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key';
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        username?: string;
        role?: string;
        restaurantId?: string | null;
      }>(token, { secret });
      request.user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        restaurantId: payload.restaurantId ?? null,
      };
    } catch {
      // optional: invalid/expired token — tenant vẫn resolve qua domain
    }
    return true;
  }
}

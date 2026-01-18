import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Skip role check for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = request;
    
    if (!user) {
      return false;
    }

    // Super admin can access everything
    if (user.role === 'super_admin') {
      return true;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}

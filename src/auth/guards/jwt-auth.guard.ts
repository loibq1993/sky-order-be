import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    return super.canActivate(context);
  }
}

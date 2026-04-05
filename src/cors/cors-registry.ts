import type { CorsAllowedOriginsService } from './cors-allowed-origins.service';

/** Đăng ký sau bootstrap để CallStaffGateway (Socket.IO) dùng cùng logic CORS với HTTP. */
let registered: CorsAllowedOriginsService | null = null;

export function setCorsAllowedOriginsService(service: CorsAllowedOriginsService): void {
  registered = service;
}

export function getCorsAllowedOriginsService(): CorsAllowedOriginsService | null {
  return registered;
}

import { getCorsAllowedOriginsService } from './cors-registry';

/** Socket.IO handshake CORS — khớp HTTP khi CORS_ORIGIN_FROM_DB=true. */
export function socketIoCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
): void {
  const svc = getCorsAllowedOriginsService();
  if (!svc || !svc.isOriginFromDbEnabled()) {
    callback(null, true);
    return;
  }
  const ok = svc.isAllowed(origin);
  callback(null, ok ? (origin !== undefined ? origin : true) : false);
}

import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const REPLAY_WINDOW_SEC = 300;

/** Verify SePay HMAC-SHA256: X-SePay-Signature + X-SePay-Timestamp over raw body bytes. */
export function verifySepayWebhookSignature(options: {
  rawBody: Buffer | string;
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  secret: string;
}): void {
  const secret = options.secret.trim();
  if (!secret) {
    throw new UnauthorizedException('SePay webhook secret is not configured for this restaurant');
  }

  const body =
    typeof options.rawBody === 'string'
      ? options.rawBody
      : options.rawBody.toString('utf8');

  const signature = (options.signatureHeader ?? '').trim();
  const timestamp = Number(options.timestampHeader ?? 0);

  if (!signature || !Number.isFinite(timestamp) || timestamp <= 0) {
    throw new UnauthorizedException('Missing SePay signature headers (X-SePay-Signature, X-SePay-Timestamp)');
  }

  if (Math.abs(Date.now() / 1000 - timestamp) > REPLAY_WINDOW_SEC) {
    throw new UnauthorizedException(
      `SePay webhook timestamp expired (drift > ${REPLAY_WINDOW_SEC}s). Sync server clock (NTP) or replay with a fresh timestamp.`,
    );
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new UnauthorizedException(
      'Invalid SePay webhook signature. Copy the exact Secret Key from SePay Dashboard (Webhook → HMAC-SHA256) into Admin → Settings → SePay → Webhook secret, then Save.',
    );
  }
}

export function sepayWebhookHasHmacHeaders(
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
): boolean {
  return Boolean(signatureHeader?.trim() && timestampHeader?.trim());
}

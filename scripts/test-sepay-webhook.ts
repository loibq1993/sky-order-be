/**
 * Giả lập webhook SePay (HMAC-SHA256) — dùng Secret Key từ SePay Dashboard (không phải whsec_ Stripe).
 *
 * Usage:
 *   npx ts-node scripts/test-sepay-webhook.ts \
 *     --secret "YOUR_SEPAY_WEBHOOK_SECRET" \
 *     --url "https://1988cf.xdemy.vn/api/payments/sepay/webhook/3d250b18-0a2d-4143-b27a-2d0c722b41ab"
 *
 * Tuỳ chọn:
 *   --body-file ./payload.json
 *   --verify-only   (chỉ in chữ ký, không gọi HTTP)
 */
import * as crypto from 'crypto';
import * as fs from 'fs';

const DEFAULT_BODY = {
  gateway: 'TPBank',
  transactionDate: '2026-06-11 03:17:01',
  accountNumber: '03808261901',
  subAccount: '',
  code: 'CF17811225',
  content: 'CFCF1781122516864-278',
  transferType: 'in',
  description: 'CFCF1781122516864-278',
  transferAmount: 55000,
  referenceCode: 'SBE31A6C71D21',
  accumulated: 284985,
  id: 7946,
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verify-only') {
      args.verifyOnly = true;
      continue;
    }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith('--')) {
        args[key] = val;
        i++;
      }
    }
  }
  return args;
}

function signSepayWebhook(rawBody: string, secret: string, timestamp: number): string {
  return (
    'sha256=' +
    crypto.createHmac('sha256', secret.trim()).update(`${timestamp}.${rawBody}`).digest('hex')
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const secret = String(args.secret || '').trim();
  const url = String(
    args.url ||
      'http://localhost:4500/api/payments/sepay/webhook/3d250b18-0a2d-4143-b27a-2d0c722b41ab',
  );

  if (!secret) {
    console.error('Missing --secret (Secret Key từ SePay Dashboard → Webhook → HMAC-SHA256)');
    process.exit(1);
  }

  const rawBody = args['body-file']
    ? fs.readFileSync(String(args['body-file']), 'utf8')
    : JSON.stringify(DEFAULT_BODY);

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signSepayWebhook(rawBody, secret, timestamp);

  console.log('--- SePay webhook test ---');
  console.log('URL:', url);
  console.log('Timestamp:', timestamp);
  console.log('Signature:', signature);
  console.log('Body length:', Buffer.byteLength(rawBody, 'utf8'));
  console.log('Body:', rawBody);

  if (args.verifyOnly) {
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SePay-Signature': signature,
      'X-SePay-Timestamp': String(timestamp),
    },
    body: rawBody,
  });

  const text = await res.text();
  console.log('HTTP', res.status, text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

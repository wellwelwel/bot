import { createHmac, timingSafeEqual } from 'node:crypto';

export function validateSignature(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = `sha256=${createHmac('sha256', secret)
    .update(body)
    .digest('hex')}`;

  return timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}

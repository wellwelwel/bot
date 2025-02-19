const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++)
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);

  return result === 0;
};

export const validateSignature = async (
  body: string,
  signature: string | undefined,
  secret: string
): Promise<boolean> => {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedSignature = `sha256=${Array.from(
    new Uint8Array(signatureBuffer)
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;

  return secureCompare(signature, expectedSignature);
};

import { randomBytes } from 'crypto';

export function generateFaqEmbedKey() {
  return randomBytes(18).toString('hex');
}

export function getFaqConfig(token: unknown) {
  const config = (token ?? {}) as Record<string, unknown>;
  const embedKey = typeof config.faq_embed_key === 'string' ? config.faq_embed_key : '';
  const allowedOrigins = Array.isArray(config.faq_allowed_origins)
    ? config.faq_allowed_origins.filter((x): x is string => typeof x === 'string')
    : [];
  return { embedKey, allowedOrigins };
}

export function originAllowed(origin: string | null, allowlist: string[]) {
  if (!allowlist.length) return true;
  if (!origin) return false;
  return allowlist.includes(origin);
}

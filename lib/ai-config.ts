export const AI_MODELS = {
  fast: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
  smart: process.env.GROQ_SMART_MODEL || 'llama-3.3-70b-versatile',
  embed: process.env.GROQ_EMBED_MODEL || 'llama3-text-embed-v2',
} as const;

export const AI_LIMITS = {
  tagMaxTokens: 160,
  chatMaxTokens: 850,
  faqMaxTokens: 320,
  reportMaxTokens: 1600,
  strategyMaxTokens: 900,
} as const;

export function clampTopK(value: unknown, fallback = 8) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(4, Math.min(20, Math.round(parsed)));
}


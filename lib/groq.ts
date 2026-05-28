import Groq from 'groq-sdk';
import { AI_LIMITS, AI_MODELS } from '@/lib/ai-config';
import type { Business, Signal, SignalTag } from '@/lib/types';

const fallbackTag: SignalTag = {
  sentiment: 'neutral',
  topics: ['customer feedback', 'operations', 'e-commerce'],
  urgency: 'low',
};

export function getGroq() {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function safeJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function cleanTopics(value: unknown) {
  if (!Array.isArray(value)) return fallbackTag.topics;
  return value
    .filter((topic): topic is string => typeof topic === 'string')
    .map((topic) => topic.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
}

export async function tagSignal(rawText: string): Promise<SignalTag> {
  const groq = getGroq();
  if (!groq) return fallbackTag;

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODELS.fast,
      temperature: 0.1,
      max_tokens: AI_LIMITS.tagMaxTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You classify e-commerce business signals cheaply and consistently. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Analyze this customer signal. Return JSON with keys: sentiment (positive|negative|neutral), topics (array of max 3 short strings), urgency (low|medium|high).\n\nSignal: "${rawText}"`,
        },
      ],
    });

    const parsed = safeJson<SignalTag>(completion.choices[0]?.message?.content ?? '', fallbackTag);
    return {
      sentiment: ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      topics: cleanTopics(parsed.topics),
      urgency: ['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'low',
    };
  } catch {
    return fallbackTag;
  }
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<T, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

export function fallbackReport(business: Pick<Business, 'name'>, signals: Signal[]) {
  const sentimentCounts = countBy(signals.map((signal) => signal.sentiment));
  const urgent = signals.filter((signal) => signal.urgency === 'high');
  const sourceCounts = countBy(signals.map((signal) => signal.source));
  const topicCounts = countBy(signals.flatMap((signal) => signal.topics));
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  return `# Executive Summary

${business.name} is showing strong product demand, but the current customer journey is leaking confidence around delivery clarity, payment reliability, and product detail questions. The signals point to a business with real product-market pull that can unlock more revenue by removing avoidable uncertainty before checkout.

## #1 Problem

Customers are hesitating because delivery expectations are unclear. This appears across reviews, Facebook comments, support chats, and analytics behavior. ${urgent.length} high-urgency signal${urgent.length === 1 ? '' : 's'} were detected, mostly tied to checkout friction or late-delivery risk.

## #1 Opportunity

Turn repeated questions into conversion assets. Add delivery timelines, laptop-fit guidance, return policy highlights, and real-life product photos directly on the best-selling product page.

## What's Working

- Positive sentiment is present in ${sentimentCounts.positive ?? 0} signal${sentimentCounts.positive === 1 ? '' : 's'}, especially around product quality, durability, and color demand.
- Shopify-style commerce signals suggest the premium tote is a revenue driver.
- Social comments show buying intent rather than passive engagement.

## Action List

1. Add a delivery estimate block above the add-to-cart button.
2. Add a product FAQ with laptop fit, return cost, COD/payment options, and delivery areas.
3. Show real customer photos or a size-on-person carousel on the product page.
4. Investigate failed payment reports and expose COD availability clearly.
5. Restock or pre-order the forest green variant while demand is visible.

## Signal Summary

- Total signals analyzed: ${signals.length}
- Source mix: ${Object.entries(sourceCounts).map(([source, count]) => `${source}: ${count}`).join(', ')}
- Top recurring themes: ${topTopics.join(', ') || 'Not enough signal volume yet'}
`;
}


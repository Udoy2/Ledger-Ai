import type { ConnectorPayload, ConnectorProvider } from '@/lib/connectors';

function buildDemoClaritySignals(seed: number): ConnectorPayload[] {
  const rageClicks = 18 + (seed % 7);
  const deadClicks = 9 + (seed % 5);
  const scrollDepth = 46 + (seed % 18);
  const engagement = 64 + (seed % 14);
  const checkoutUrl = '/checkout';
  const productUrl = '/products/premium-leather-tote';

  return [
    {
      source: 'microsoft_clarity',
      type: 'ux_friction_summary',
      raw_text: `Clarity detected ${rageClicks} rage clicks and ${deadClicks} dead clicks in 24h, concentrated on ${checkoutUrl} and ${productUrl}.`,
      metadata: { mode: 'demo', rage_clicks: rageClicks, dead_clicks: deadClicks, top_urls: [checkoutUrl, productUrl] },
      sentiment: 'negative',
      topics: ['rage clicks', 'dead clicks', 'checkout friction'],
      urgency: rageClicks > 21 ? 'high' : 'medium',
    },
    {
      source: 'microsoft_clarity',
      type: 'engagement_summary',
      raw_text: `Clarity shows ${scrollDepth}% average scroll depth and ${engagement} seconds average engagement time, with mobile users dropping before trust signals.`,
      metadata: { mode: 'demo', scroll_depth_pct: scrollDepth, avg_engagement_seconds: engagement, segment: 'mobile' },
      sentiment: 'neutral',
      topics: ['scroll depth', 'engagement time', 'mobile behavior'],
      urgency: scrollDepth < 55 ? 'medium' : 'low',
    },
  ];
}

export const clarityProvider: ConnectorProvider = {
  source: 'microsoft_clarity',
  async collect({ business, options }) {
    const token = (business as any)?.google_token?.clarity_api_token as string | undefined;
    const numOfDays = Math.max(1, Math.min(3, Number(options?.numOfDays ?? 1)));
    const dimension1 = String(options?.dimension1 ?? 'URL');
    if (token) {
      try {
        const response = await fetch(
          `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}&dimension1=${encodeURIComponent(dimension1)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          },
        );
        if (response.ok) {
          const json = await response.json();
          const rageClicks = Number(json?.summary?.rageClickCount ?? json?.rageClickCount ?? 0);
          const deadClicks = Number(json?.summary?.deadClickCount ?? json?.deadClickCount ?? 0);
          const scrollDepth = Number(json?.summary?.scrollDepth ?? json?.scrollDepth ?? 0);
          const engagement = Number(json?.summary?.engagementTime ?? json?.engagementTime ?? 0);
          const topUrls =
            Array.isArray(json?.dimensionValues) && json.dimensionValues.length > 0
              ? json.dimensionValues.slice(0, 3).map((x: any) => String(x?.name ?? x?.value ?? '')).filter(Boolean)
              : ['/checkout', '/products/premium-leather-tote'];

          return [
            {
              source: 'microsoft_clarity',
              type: 'ux_friction_summary',
              raw_text: `Clarity detected ${rageClicks} rage clicks and ${deadClicks} dead clicks in the last 24h, concentrated on ${topUrls.join(', ')}.`,
              metadata: { mode: 'api', rage_clicks: rageClicks, dead_clicks: deadClicks, top_urls: topUrls, num_of_days: numOfDays, dimension1 },
              sentiment: 'negative',
              topics: ['rage clicks', 'dead clicks', 'checkout friction'],
              urgency: rageClicks > 20 ? 'high' : 'medium',
            },
            {
              source: 'microsoft_clarity',
              type: 'engagement_summary',
              raw_text: `Clarity shows ${scrollDepth}% average scroll depth and ${engagement} seconds engagement time.`,
              metadata: { mode: 'api', scroll_depth_pct: scrollDepth, avg_engagement_seconds: engagement, num_of_days: numOfDays, dimension1 },
              sentiment: 'neutral',
              topics: ['scroll depth', 'engagement time', 'behavior analytics'],
              urgency: scrollDepth < 55 ? 'medium' : 'low',
            },
          ];
        }
      } catch {
        // Fall through to demo mode
      }
    }

    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return buildDemoClaritySignals(seed);
  },
};

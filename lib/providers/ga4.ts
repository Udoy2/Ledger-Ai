import { google } from 'googleapis';
import type { ConnectorPayload, ConnectorProvider } from '@/lib/connectors';
import { getValidGoogleAccessToken, buildOAuth2Client } from '@/lib/google-auth';

/* ------------------------------------------------------------------ */
/*  Demo fallback data                                                 */
/* ------------------------------------------------------------------ */

function buildDemoGa4Signals(seed: number): ConnectorPayload[] {
  const sessions = 1200 + (seed % 17) * 37;
  const bounceRate = Math.max(38, 72 - (seed % 11));
  const avgDuration = 95 + (seed % 13) * 7;
  const mobileShare = 62 + (seed % 9);
  const conversions = 28 + (seed % 7) * 3;
  const convRate = Number(((conversions / sessions) * 100).toFixed(2));
  const topPages = ['/products/premium-leather-tote', '/checkout', '/collections/summer'];

  return [
    {
      source: 'google_analytics',
      type: 'ga4_traffic_summary',
      raw_text: `GA4 daily summary: ${sessions} sessions in the last 24h, ${bounceRate}% bounce rate, average session duration ${avgDuration}s. Mobile traffic share is ${mobileShare}%. Top pages: ${topPages.join(', ')}.`,
      metadata: {
        mode: 'demo',
        sessions,
        bounce_rate: bounceRate,
        avg_session_duration: avgDuration,
        mobile_share: mobileShare,
        top_pages: topPages,
      },
      sentiment: bounceRate > 60 ? 'negative' : 'neutral',
      topics: ['traffic quality', 'bounce rate', 'session duration'],
      urgency: bounceRate > 65 ? 'high' : 'medium',
    },
    {
      source: 'google_analytics',
      type: 'ga4_conversion_summary',
      raw_text: `GA4 conversion report: ${conversions} conversions at a ${convRate}% rate. Checkout drop-off is ${Math.max(18, 44 - (seed % 11))}%, with the biggest losses on the shipping step.`,
      metadata: {
        mode: 'demo',
        conversions,
        conversion_rate: convRate,
        checkout_drop_off: Math.max(18, 44 - (seed % 11)),
      },
      sentiment: convRate > 2.5 ? 'positive' : 'negative',
      topics: ['conversions', 'checkout funnel', 'revenue'],
      urgency: convRate < 2 ? 'high' : 'medium',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Real GA4 Data API fetch                                            */
/* ------------------------------------------------------------------ */

async function fetchRealGa4Data(
  accessToken: string,
  propertyId: string,
): Promise<ConnectorPayload[]> {
  const oauth2 = buildOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });

  const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2 });

  // --- Request 1: Traffic overview ---
  const trafficRes = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViews' },
      ],
      dimensions: [{ name: 'deviceCategory' }],
    },
  });

  // --- Request 2: Conversions ---
  const convRes = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'userConversionRate' },
      ],
    },
  });

  // --- Request 3: Top pages ---
  const pagesRes = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensions: [{ name: 'pagePath' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: '5',
    },
  });

  // Parse traffic
  const trafficRows = trafficRes.data.rows ?? [];
  let totalSessions = 0;
  let totalBounce = 0;
  let totalDuration = 0;
  let mobileSessionCount = 0;
  let rowCount = 0;

  for (const row of trafficRows) {
    const device = row.dimensionValues?.[0]?.value ?? '';
    const sess = Number(row.metricValues?.[0]?.value ?? 0);
    const bounce = Number(row.metricValues?.[1]?.value ?? 0);
    const dur = Number(row.metricValues?.[2]?.value ?? 0);

    totalSessions += sess;
    totalBounce += bounce * sess; // weighted
    totalDuration += dur * sess;
    if (device.toLowerCase() === 'mobile') mobileSessionCount += sess;
    rowCount++;
  }

  const avgBounce = totalSessions > 0 ? Math.round((totalBounce / totalSessions) * 100) : 0;
  const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
  const mobileShare = totalSessions > 0 ? Math.round((mobileSessionCount / totalSessions) * 100) : 0;

  // Parse conversions
  const convRow = convRes.data.rows?.[0];
  const conversions = Number(convRow?.metricValues?.[1]?.value ?? 0);
  const convRate = Number(Number(convRow?.metricValues?.[2]?.value ?? 0).toFixed(2));

  // Parse top pages
  const pagesData = pagesRes.data as { rows?: Array<{ dimensionValues?: Array<{ value?: string | null }> }> };
  const topPages = (pagesData.rows ?? [])
    .slice(0, 5)
    .map((r) => r.dimensionValues?.[0]?.value ?? '/')
    .filter(Boolean);

  const signals: ConnectorPayload[] = [
    {
      source: 'google_analytics',
      type: 'ga4_traffic_summary',
      raw_text: `GA4 daily summary: ${totalSessions} sessions in the last 24h, ${avgBounce}% bounce rate, average session duration ${avgDuration}s. Mobile traffic share is ${mobileShare}%. Top pages: ${topPages.join(', ')}.`,
      metadata: {
        mode: 'api',
        sessions: totalSessions,
        bounce_rate: avgBounce,
        avg_session_duration: avgDuration,
        mobile_share: mobileShare,
        top_pages: topPages,
        property_id: propertyId,
      },
      sentiment: avgBounce > 60 ? 'negative' : 'neutral',
      topics: ['traffic quality', 'bounce rate', 'session duration'],
      urgency: avgBounce > 65 ? 'high' : 'medium',
    },
    {
      source: 'google_analytics',
      type: 'ga4_conversion_summary',
      raw_text: `GA4 conversion report: ${conversions} conversions at a ${convRate}% rate over the last 24h.`,
      metadata: {
        mode: 'api',
        conversions,
        conversion_rate: convRate,
        property_id: propertyId,
      },
      sentiment: convRate > 2.5 ? 'positive' : 'negative',
      topics: ['conversions', 'checkout funnel', 'revenue'],
      urgency: convRate < 2 ? 'high' : 'medium',
    },
  ];

  return signals;
}

/* ------------------------------------------------------------------ */
/*  Connector provider                                                 */
/* ------------------------------------------------------------------ */

export const ga4Provider: ConnectorProvider = {
  source: 'google_analytics',

  async collect({ business, options }) {
    const supabaseAdmin = options?._supabase as any;
    const propertyId = (business as any)?.ga4_property_id as string | undefined;

    if (propertyId && supabaseAdmin) {
      const accessToken = await getValidGoogleAccessToken(supabaseAdmin, business);
      if (accessToken) {
        try {
          return await fetchRealGa4Data(accessToken, propertyId);
        } catch (err: any) {
          // Log but fall through to demo mode
          console.error('[ga4Provider] Real API error, falling back to demo:', err?.message ?? err);
        }
      }
    }

    // Demo fallback
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return buildDemoGa4Signals(seed);
  },
};

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
  async collect({ business, mode, options }) {
    const token = (business as any)?.google_token?.clarity_api_token as string | undefined;
    const numOfDays = Math.max(1, Math.min(3, Number(options?.numOfDays ?? 1)));
    const dimension1 = String(options?.dimension1 ?? 'URL');

    // If a real token exists (or caller explicitly wants api mode), hit the real API.
    if (token) {
      const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}&dimension1=${encodeURIComponent(dimension1)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const body = await response.text();
          if (body) detail += ` — ${body.slice(0, 300)}`;
        } catch { /* ignore */ }
        throw new Error(`Clarity API error: ${detail}`);
      }

      const text = await response.text();
      console.log('[Clarity] status', response.status);
      console.log('[Clarity] body (first 2000 chars)', text.slice(0, 2000));

      // --- Parse the real Clarity response ---
      // Clarity returns: Array<{ metricName: string; information: Record<string, unknown>[] }>
      // metricNames: DeadClickCount, ExcessiveScroll, RageClickCount, QuickbackClick,
      //   ScriptErrorCount, ErrorClickCount, ScrollDepth, Traffic, EngagementTime
      const metrics: Array<{ metricName: string; information: Record<string, unknown>[] }> = JSON.parse(text);

      // Helper: find a metric block by exact metricName
      const metricMap = new Map(metrics.map((m) => [m.metricName, m.information ?? []]));

      // Helper: sum a numeric field across all rows (handles string values)
      function sumField(info: Record<string, unknown>[] | undefined, field: string): number {
        if (!info?.length) return 0;
        let total = 0;
        for (const row of info) {
          const v = Number(row[field]);
          if (!isNaN(v)) total += v;
        }
        return Math.round(total * 100) / 100;
      }

      // Helper: weighted average (weight by sessionsCount where available)
      function avgField(info: Record<string, unknown>[] | undefined, field: string): number {
        if (!info?.length) return 0;
        let total = 0;
        let count = 0;
        for (const row of info) {
          const v = Number(row[field]);
          if (!isNaN(v)) { total += v; count++; }
        }
        return count > 0 ? Math.round((total / count) * 100) / 100 : 0;
      }

      // --- Extract values using the ACTUAL field names from the Clarity response ---
      // Click metrics: subTotal is the count of the metric (string)
      const rageClicks = sumField(metricMap.get('RageClickCount'), 'subTotal');
      const deadClicks = sumField(metricMap.get('DeadClickCount'), 'subTotal');
      const errorClicks = sumField(metricMap.get('ErrorClickCount'), 'subTotal');
      const quickbacks = sumField(metricMap.get('QuickbackClick'), 'subTotal');
      const excessiveScrolls = sumField(metricMap.get('ExcessiveScroll'), 'subTotal');
      const scriptErrors = sumField(metricMap.get('ScriptErrorCount'), 'subTotal');

      // Scroll depth: averageScrollDepth (number, per URL)
      const scrollDepth = avgField(metricMap.get('ScrollDepth'), 'averageScrollDepth');

      // Engagement time: totalTime and activeTime are in seconds (strings)
      const totalEngagementTime = sumField(metricMap.get('EngagementTime'), 'totalTime');
      const activeEngagementTime = sumField(metricMap.get('EngagementTime'), 'activeTime');

      // Traffic: totalSessionCount (string), distinctUserCount (string)
      const totalSessions = sumField(metricMap.get('Traffic'), 'totalSessionCount');
      const totalBotSessions = sumField(metricMap.get('Traffic'), 'totalBotSessionCount');
      const distinctUsers = sumField(metricMap.get('Traffic'), 'distinctUserCount');

      // Extract top URLs from Traffic metric (Url field, capital U)
      const trafficInfo = metricMap.get('Traffic') ?? [];
      const topUrls = trafficInfo
        .slice(0, 5)
        .map((row) => {
          const rawUrl = String(row['Url'] ?? '');
          try { return new URL(rawUrl).pathname; } catch { return rawUrl; }
        })
        .filter(Boolean);

      console.log('[Clarity] metric names found:', [...metricMap.keys()]);
      console.log('[Clarity] parsed →', {
        rageClicks, deadClicks, errorClicks, quickbacks, excessiveScrolls, scriptErrors,
        scrollDepth, totalEngagementTime, activeEngagementTime,
        totalSessions, totalBotSessions, distinctUsers, topUrls,
      });

      // ============================================================
      // Build rich, per-page signals for maximum AI insight quality
      // ============================================================
      const signals: ConnectorPayload[] = [];

      // Helper: shorten a full URL to just the pathname for readability
      function shortUrl(raw: string): string {
        try { return new URL(raw).pathname; } catch { return raw; }
      }

      // --- Collect per-page data into a unified structure ---
      type PageData = {
        url: string; path: string;
        sessions: number; bots: number; users: number; pagesPerSession: number;
        scrollDepth: number; totalTime: number; activeTime: number;
        rageClicks: number; deadClicks: number; errorClicks: number;
        quickbacks: number; excessiveScrolls: number; scriptErrors: number;
        quickbackPct: number;
      };

      const allUrls = new Set<string>();
      for (const m of metrics) {
        for (const row of m.information ?? []) {
          if (row['Url']) allUrls.add(String(row['Url']));
        }
      }

      function getVal(metricName: string, url: string, field: string): number {
        const rows = metricMap.get(metricName) ?? [];
        const row = rows.find((r) => String(r['Url']) === url);
        return row ? Number(row[field]) || 0 : 0;
      }

      const pages: PageData[] = [...allUrls].map((url) => ({
        url,
        path: shortUrl(url),
        sessions: getVal('Traffic', url, 'totalSessionCount'),
        bots: getVal('Traffic', url, 'totalBotSessionCount'),
        users: getVal('Traffic', url, 'distinctUserCount'),
        pagesPerSession: getVal('Traffic', url, 'pagesPerSessionPercentage'),
        scrollDepth: getVal('ScrollDepth', url, 'averageScrollDepth'),
        totalTime: getVal('EngagementTime', url, 'totalTime'),
        activeTime: getVal('EngagementTime', url, 'activeTime'),
        rageClicks: getVal('RageClickCount', url, 'subTotal'),
        deadClicks: getVal('DeadClickCount', url, 'subTotal'),
        errorClicks: getVal('ErrorClickCount', url, 'subTotal'),
        quickbacks: getVal('QuickbackClick', url, 'subTotal'),
        excessiveScrolls: getVal('ExcessiveScroll', url, 'subTotal'),
        scriptErrors: getVal('ScriptErrorCount', url, 'subTotal'),
        quickbackPct: getVal('QuickbackClick', url, 'sessionsWithMetricPercentage'),
      }));

      // Sort by sessions descending (highest traffic first)
      pages.sort((a, b) => b.sessions - a.sessions);

      console.log('[Clarity] pages built:', pages.length, pages.map((p) => `${p.path} (${p.sessions}s)`));

      // ── Signal 1: Overall site health summary ──
      const totalFriction = rageClicks + deadClicks + errorClicks + quickbacks;
      const healthScore = totalFriction === 0 ? 'healthy' : totalFriction <= 5 ? 'minor issues' : 'needs attention';
      signals.push({
        source: 'microsoft_clarity',
        type: 'site_health_overview',
        raw_text: [
          `Site health: ${healthScore}.`,
          `${totalSessions} sessions from ${distinctUsers} users (${totalBotSessions} bots) over ${numOfDays} day(s).`,
          `Avg scroll depth: ${scrollDepth}%. Total engagement: ${totalEngagementTime}s (${activeEngagementTime}s active).`,
          totalFriction > 0 ? `UX friction: ${rageClicks} rage, ${deadClicks} dead, ${errorClicks} error clicks, ${quickbacks} quickbacks.` : 'No UX friction detected.',
          `Pages tracked: ${pages.map((p) => p.path).join(', ')}.`,
        ].join(' '),
        metadata: {
          mode: 'api', health_score: healthScore,
          total_sessions: totalSessions, distinct_users: distinctUsers,
          bot_sessions: totalBotSessions, scroll_depth_pct: scrollDepth,
          total_engagement_seconds: totalEngagementTime,
          active_engagement_seconds: activeEngagementTime,
          rage_clicks: rageClicks, dead_clicks: deadClicks,
          error_clicks: errorClicks, quickbacks,
          excessive_scrolls: excessiveScrolls, script_errors: scriptErrors,
          pages_tracked: pages.length, num_of_days: numOfDays,
        },
        sentiment: totalFriction > 5 ? 'negative' : totalFriction > 0 ? 'neutral' : 'positive',
        topics: ['site health', 'UX overview', 'traffic summary'],
        urgency: totalFriction > 20 ? 'high' : totalFriction > 5 ? 'medium' : 'low',
      });

      // ── Signal 2: Per-page engagement breakdown ──
      for (const page of pages) {
        const idleTime = page.totalTime - page.activeTime;
        const idlePct = page.totalTime > 0 ? Math.round((idleTime / page.totalTime) * 100) : 0;

        signals.push({
          source: 'microsoft_clarity',
          type: 'page_engagement',
          raw_text: [
            `Page "${page.path}": ${page.sessions} sessions, ${page.users} users.`,
            `Scroll depth: ${page.scrollDepth}%.`,
            `Engagement: ${page.totalTime}s total (${page.activeTime}s active, ${idleTime}s idle — ${idlePct}% idle).`,
            `Pages/session: ${page.pagesPerSession}.`,
            page.bots > 0 ? `Bot sessions: ${page.bots}.` : '',
          ].filter(Boolean).join(' '),
          metadata: {
            mode: 'api', page_url: page.url, page_path: page.path,
            sessions: page.sessions, users: page.users, bots: page.bots,
            scroll_depth: page.scrollDepth, total_time: page.totalTime,
            active_time: page.activeTime, idle_time: idleTime, idle_pct: idlePct,
            pages_per_session: page.pagesPerSession, num_of_days: numOfDays,
          },
          sentiment: page.scrollDepth < 20 ? 'negative' : 'neutral',
          topics: ['page engagement', page.path, 'scroll depth'],
          urgency: page.scrollDepth < 20 && page.sessions > 2 ? 'medium' : 'low',
        });
      }

      // ── Signal 3: Per-page UX friction (only for pages WITH friction) ──
      for (const page of pages) {
        const friction = page.rageClicks + page.deadClicks + page.errorClicks + page.quickbacks;
        if (friction === 0 && page.excessiveScrolls === 0 && page.scriptErrors === 0) continue;

        const parts: string[] = [];
        if (page.rageClicks > 0) parts.push(`${page.rageClicks} rage clicks`);
        if (page.deadClicks > 0) parts.push(`${page.deadClicks} dead clicks`);
        if (page.errorClicks > 0) parts.push(`${page.errorClicks} error clicks`);
        if (page.quickbacks > 0) parts.push(`${page.quickbacks} quickbacks (${page.quickbackPct}% of sessions)`);
        if (page.excessiveScrolls > 0) parts.push(`${page.excessiveScrolls} excessive scrolls`);
        if (page.scriptErrors > 0) parts.push(`${page.scriptErrors} script errors`);

        signals.push({
          source: 'microsoft_clarity',
          type: 'page_friction',
          raw_text: `UX friction on "${page.path}": ${parts.join(', ')}. This page had ${page.sessions} sessions from ${page.users} users.`,
          metadata: {
            mode: 'api', page_url: page.url, page_path: page.path,
            rage_clicks: page.rageClicks, dead_clicks: page.deadClicks,
            error_clicks: page.errorClicks, quickbacks: page.quickbacks,
            quickback_pct: page.quickbackPct, excessive_scrolls: page.excessiveScrolls,
            script_errors: page.scriptErrors, sessions: page.sessions,
            num_of_days: numOfDays,
          },
          sentiment: 'negative',
          topics: ['UX friction', page.path, 'user frustration'],
          urgency: page.rageClicks > 5 ? 'high' : friction > 2 ? 'medium' : 'low',
        });
      }

      // ── Signal 4: Low scroll depth alert (pages < 25%) ──
      const lowScrollPages = pages.filter((p) => p.scrollDepth > 0 && p.scrollDepth < 25 && p.sessions >= 2);
      if (lowScrollPages.length > 0) {
        signals.push({
          source: 'microsoft_clarity',
          type: 'low_scroll_alert',
          raw_text: `Low scroll depth detected on ${lowScrollPages.length} page(s): ${lowScrollPages.map((p) => `${p.path} (${p.scrollDepth}%, ${p.sessions} sessions)`).join('; ')}. Users may not be seeing key content below the fold.`,
          metadata: {
            mode: 'api',
            pages: lowScrollPages.map((p) => ({ path: p.path, scroll_depth: p.scrollDepth, sessions: p.sessions })),
            num_of_days: numOfDays,
          },
          sentiment: 'negative',
          topics: ['scroll depth', 'content visibility', 'above the fold'],
          urgency: lowScrollPages.some((p) => p.scrollDepth < 15) ? 'high' : 'medium',
        });
      }

      // ── Signal 5: High idle time alert (pages where active < 30% of total) ──
      const highIdlePages = pages.filter((p) => p.totalTime > 10 && p.activeTime / p.totalTime < 0.3);
      if (highIdlePages.length > 0) {
        signals.push({
          source: 'microsoft_clarity',
          type: 'idle_engagement_alert',
          raw_text: `High idle engagement on ${highIdlePages.length} page(s): ${highIdlePages.map((p) => `${p.path} (${p.activeTime}s active of ${p.totalTime}s total — ${Math.round((p.activeTime / p.totalTime) * 100)}% active)`).join('; ')}. Users may be leaving tabs open without interacting.`,
          metadata: {
            mode: 'api',
            pages: highIdlePages.map((p) => ({ path: p.path, active_time: p.activeTime, total_time: p.totalTime })),
            num_of_days: numOfDays,
          },
          sentiment: 'negative',
          topics: ['idle time', 'engagement quality', 'tab abandonment'],
          urgency: 'medium',
        });
      }

      // ── Signal 6: Bot traffic alert (if bots > 20% of sessions) ──
      const botPct = totalSessions > 0 ? Math.round((totalBotSessions / totalSessions) * 100) : 0;
      if (botPct > 20) {
        signals.push({
          source: 'microsoft_clarity',
          type: 'bot_traffic_alert',
          raw_text: `${botPct}% of sessions (${totalBotSessions} of ${totalSessions}) are from bots. This may skew analytics and engagement metrics.`,
          metadata: {
            mode: 'api', bot_pct: botPct, bot_sessions: totalBotSessions,
            total_sessions: totalSessions, num_of_days: numOfDays,
          },
          sentiment: 'negative',
          topics: ['bot traffic', 'data quality', 'traffic integrity'],
          urgency: botPct > 50 ? 'high' : 'medium',
        });
      }

      // ── Signal 7: Traffic distribution insight ──
      if (pages.length > 1) {
        const topPage = pages[0];
        const topPagePct = totalSessions > 0 ? Math.round((topPage.sessions / totalSessions) * 100) : 0;
        signals.push({
          source: 'microsoft_clarity',
          type: 'traffic_distribution',
          raw_text: `Traffic distribution across ${pages.length} pages: ${pages.map((p) => `${p.path} — ${p.sessions} sessions (${p.users} users)`).join('; ')}. Most visited: ${topPage.path} (${topPagePct}% of traffic).`,
          metadata: {
            mode: 'api',
            pages: pages.map((p) => ({ path: p.path, sessions: p.sessions, users: p.users, pct: totalSessions > 0 ? Math.round((p.sessions / totalSessions) * 100) : 0 })),
            most_visited: topPage.path, most_visited_pct: topPagePct,
            num_of_days: numOfDays,
          },
          sentiment: 'neutral',
          topics: ['traffic distribution', 'popular pages', 'user flow'],
          urgency: 'low',
        });
      }

      console.log(`[Clarity] generated ${signals.length} signals from ${pages.length} pages`);
      return signals;
    }

    // Explicit api mode but no token saved — surface a clear error.
    if (mode === 'api') {
      throw new Error('No Clarity API token saved. Use "Connect Clarity" to save your token first.');
    }

    // Demo fallback.
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return buildDemoClaritySignals(seed);
  },
};

import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { buildOAuth2Client, GA4_SCOPES } from '@/lib/google-auth';

/**
 * GET  → Redirect to Google OAuth consent screen (real flow)
 * POST → Legacy test-data connection (kept for backward compat)
 */

export async function GET(request: Request) {
  const { business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If Google credentials are not configured, fall back to test mode info
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({
      provider: 'google_analytics',
      oauth_configured: false,
      message: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set. Use POST to connect in test mode.',
      test_endpoint: 'POST /api/integrations/ga4/connect',
    });
  }

  const origin = new URL(request.url).origin;
  const oauth2 = buildOAuth2Client(origin);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GA4_SCOPES,
    state: business.id, // pass business ID through OAuth state
  });

  return NextResponse.redirect(authUrl);
}

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const propertyId = typeof body?.ga4_property_id === 'string' && body.ga4_property_id.trim()
    ? body.ga4_property_id.trim()
    : 'test-property';

  // Preserve existing token data from other providers (e.g. Clarity)
  const previous = (business.google_token ?? {}) as Record<string, unknown>;
  const tokenPayload = {
    ...previous,
    provider: 'google_analytics',
    mode: 'test_data',
    status: 'connected',
    connected_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('businesses')
    .update({
      ga4_property_id: propertyId,
      google_token: tokenPayload,
    })
    .eq('id', business.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    mode: 'test_data',
    message: 'GA connection marked for this business. You can now sync GA test data.',
    business_id: business.id,
    ga4_property_id: propertyId,
  });
}

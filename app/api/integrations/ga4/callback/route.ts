import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { buildOAuth2Client, type GoogleTokenPayload } from '@/lib/google-auth';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback handler.
 * Google redirects here after user grants consent.
 * Exchanges the code for tokens, discovers GA4 properties, and saves to DB.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // business ID
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(
      `${url.origin}/dashboard?ga4_error=${encodeURIComponent(errorParam)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/dashboard?ga4_error=${encodeURIComponent('Missing authorization code')}`,
    );
  }

  // Verify user is authenticated
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${url.origin}/auth/login`);
  }

  // Get business (prefer state param, fall back to user lookup)
  let businessId = state;
  if (!businessId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    businessId = biz?.id;
  }
  if (!businessId) {
    return NextResponse.redirect(
      `${url.origin}/dashboard?ga4_error=${encodeURIComponent('No business found')}`,
    );
  }

  try {
    const oauth2 = buildOAuth2Client(url.origin);

    // Exchange code for tokens
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Try to discover the first GA4 property
    let ga4PropertyId: string | null = null;
    try {
      const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth2 });
      const accountsRes = await admin.accounts.list();
      const accounts = accountsRes.data.accounts ?? [];

      for (const account of accounts) {
        if (ga4PropertyId) break;
        const accountName = account.name; // e.g. "accounts/123456"
        if (!accountName) continue;

        const propertiesRes = await admin.properties.list({
          filter: `parent:${accountName}`,
          pageSize: 5,
        });
        const properties = propertiesRes.data.properties ?? [];
        if (properties.length > 0 && properties[0].name) {
          // "properties/123456789" → "123456789"
          ga4PropertyId = properties[0].name.replace('properties/', '');
        }
      }
    } catch {
      // Admin API may not be enabled — user can set property ID manually
    }

    // Read existing token data to preserve other provider entries (e.g. Clarity)
    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('google_token')
      .eq('id', businessId)
      .single();

    const previous = (existingBiz?.google_token ?? {}) as Record<string, unknown>;

    const tokenPayload: GoogleTokenPayload = {
      ...previous,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? (previous.refresh_token as string) ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      token_type: tokens.token_type ?? 'Bearer',
      scope: tokens.scope ?? undefined,
      ga4_connected_at: new Date().toISOString(),
    };

    const updateData: Record<string, unknown> = { google_token: tokenPayload };
    if (ga4PropertyId) {
      updateData.ga4_property_id = ga4PropertyId;
    }

    await supabase.from('businesses').update(updateData).eq('id', businessId);

    const successMsg = ga4PropertyId
      ? `Connected! Property ${ga4PropertyId} auto-detected.`
      : 'Connected! Set your GA4 Property ID in settings.';

    return NextResponse.redirect(
      `${url.origin}/dashboard?ga4_success=${encodeURIComponent(successMsg)}`,
    );
  } catch (err: any) {
    const msg = err?.message ?? 'Token exchange failed';
    return NextResponse.redirect(
      `${url.origin}/dashboard?ga4_error=${encodeURIComponent(msg)}`,
    );
  }
}

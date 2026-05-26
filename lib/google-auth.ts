import { google } from 'googleapis';

/**
 * Build a pre-configured Google OAuth2 client.
 * Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET from env.
 * The redirect URI is derived from the request origin or NEXTAUTH_URL.
 */
export function buildOAuth2Client(origin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
  }

  const base = origin ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const redirectUri = `${base.replace(/\/$/, '')}/api/integrations/ga4/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Google Analytics read-only scope */
export const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

/**
 * Stored token shape in the `businesses.google_token` jsonb column.
 * Other providers (Clarity) may store adjacent keys in the same column.
 */
export type GoogleTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
  ga4_connected_at?: string;
  /** Preserved from other providers sharing the column */
  [key: string]: unknown;
};

/**
 * Get a valid (refreshed-if-needed) access token for a business.
 * Returns null if the business has no Google token.
 */
export async function getValidGoogleAccessToken(
  supabase: any,
  business: { id: string; google_token?: unknown },
): Promise<string | null> {
  const stored = business.google_token as GoogleTokenPayload | null | undefined;
  if (!stored?.access_token) return null;

  const oauth2 = buildOAuth2Client();
  oauth2.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
  });

  // Check if token is expired (with 5-min buffer)
  const expiresAt = stored.expiry_date ?? 0;
  const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000;

  if (needsRefresh && stored.refresh_token) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();

      // Merge new credentials back into the stored payload
      const updated: GoogleTokenPayload = {
        ...stored,
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date ?? undefined,
        token_type: credentials.token_type ?? stored.token_type,
      };

      // Persist refreshed token
      await supabase
        .from('businesses')
        .update({ google_token: updated })
        .eq('id', business.id);

      return credentials.access_token!;
    } catch {
      // Refresh failed — token may have been revoked
      return null;
    }
  }

  return stored.access_token;
}

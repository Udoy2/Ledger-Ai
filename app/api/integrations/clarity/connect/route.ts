import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const clarityApiToken =
    typeof body?.clarity_api_token === 'string' && body.clarity_api_token.trim()
      ? body.clarity_api_token.trim()
      : '';

  if (!clarityApiToken) {
    return NextResponse.json({ error: 'clarity_api_token is required' }, { status: 400 });
  }

  const previous = (business.google_token ?? {}) as Record<string, unknown>;
  const nextToken = {
    ...previous,
    clarity_api_token: clarityApiToken,
    clarity_connected_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('businesses')
    .update({
      google_token: nextToken,
    })
    .eq('id', business.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Microsoft Clarity connected. You can now run Clarity sync.',
    auth_mode: 'api_token',
    clarity_data_export_doc: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api',
  });
}

export async function GET() {
  return NextResponse.json({
    provider: 'microsoft_clarity',
    auth_mode: 'api_token',
    oauth_supported: false,
    message: 'Clarity Data Export currently authenticates with admin-generated API token, not OAuth client flow.',
    setup_url: 'https://clarity.microsoft.com/',
    docs_url: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api',
  });
}

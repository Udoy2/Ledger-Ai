import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';

export async function POST(request: Request) {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const propertyId = typeof body?.ga4_property_id === 'string' && body.ga4_property_id.trim()
    ? body.ga4_property_id.trim()
    : 'test-property';

  const tokenPayload = {
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

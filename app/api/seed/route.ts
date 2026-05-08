import { NextResponse } from 'next/server';
import { getAuthedBusiness } from '@/lib/auth';
import { demoSignals } from '@/lib/demo';

export async function POST() {
  const { supabase, business } = await getAuthedBusiness();
  if (!business) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ success: true, inserted: 0, message: 'Demo data already loaded.' });
  }

  const { data, error } = await supabase
    .from('signals')
    .insert(demoSignals.map((signal) => ({ ...signal, business_id: business.id })))
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted: data?.length ?? 0 });
}

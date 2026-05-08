import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: 'Cron endpoint is wired. Add service-role batch generation before production scheduling.',
  });
}

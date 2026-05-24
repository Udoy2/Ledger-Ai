import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') ?? '';
  if (!key) return new NextResponse('// Missing key', { status: 400, headers: { 'content-type': 'application/javascript; charset=utf-8' } });

  const host = url.origin;
  const iframeUrl = `${host}/embed/faq?key=${encodeURIComponent(key)}`;
  const js = `
(function () {
  if (window.__klFaqWidgetLoaded) return;
  window.__klFaqWidgetLoaded = true;

  var frame = document.createElement('iframe');
  frame.src = ${JSON.stringify(iframeUrl)};
  frame.title = 'FAQ Assistant';
  frame.style.position = 'fixed';
  frame.style.bottom = '18px';
  frame.style.right = '18px';
  frame.style.width = '380px';
  frame.style.height = '560px';
  frame.style.border = '0';
  frame.style.borderRadius = '12px';
  frame.style.boxShadow = '0 12px 40px rgba(15,23,42,0.22)';
  frame.style.zIndex = '2147483000';
  frame.allow = 'clipboard-write';
  document.body.appendChild(frame);
})();
`.trim();

  return new NextResponse(js, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}

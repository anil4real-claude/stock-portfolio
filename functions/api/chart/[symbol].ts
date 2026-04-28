// Cloudflare Pages Function — proxies Yahoo Finance chart data
// Route: /api/chart/:symbol?range=3mo&interval=1d

interface Env {}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const symbol = context.params.symbol as string;
  const url = new URL(context.request.url);
  const range = url.searchParams.get('range') || '3mo';
  const interval = url.searchParams.get('interval') || '1d';

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  try {
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

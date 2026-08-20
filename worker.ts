/**
 * Cloudflare Worker: CORS Proxy for Yahoo Finance API
 * 
 * Provides a secure, $0 cost CORS proxy exclusively for Yahoo Finance endpoints.
 * Appends 'Access-Control-Allow-Origin: *' headers to allow client-side web requests.
 * Uses UK English for documentation and internal variables.
 */

export interface Env {
  // Cloudflare Worker environment variables if required
}

const ALLOWED_HOSTS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, _env: Env, _ctx: any): Promise<Response> {
    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Only GET requests are proxied.' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }

    try {
      const requestUrl = new URL(request.url);
      const targetUrlString = requestUrl.searchParams.get('url');

      if (!targetUrlString) {
        return new Response(
          JSON.stringify({
            error: 'Missing target URL parameter. Example usage: /?url=https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...CORS_HEADERS,
            },
          }
        );
      }

      const targetUrl = new URL(targetUrlString);

      // Security check: restrict proxying strictly to allowed Yahoo Finance hosts
      if (!ALLOWED_HOSTS.includes(targetUrl.hostname.toLowerCase())) {
        return new Response(
          JSON.stringify({
            error: `Unauthorised host target '${targetUrl.hostname}'. Proxy is strictly restricted to Yahoo Finance domains.`,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...CORS_HEADERS,
            },
          }
        );
      }

      // Fetch from target domain with browser-like User-Agent
      const response = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      const responseBody = await response.text();

      return new Response(responseBody, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          ...CORS_HEADERS,
        },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          error: 'Failed to proxy request via Cloudflare Worker.',
          details: error.message || 'Unknown network error',
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }
  },
};

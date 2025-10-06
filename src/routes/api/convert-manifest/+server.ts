import type { RequestHandler } from './$types';

/**
 * POST /api/convert-manifest
 * Body: { code: string }
 * Uses GitHub App Manifest Conversion API:
 *   POST https://api.github.com/app-manifests/{code}/conversions
 * Returns the created app credentials (app id, pem, webhook secret, client id/secret, slug, owner info, etc.)
 * NOTE: This endpoint does not require authentication per GitHub docs (the code is a one-time token)
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { code } = await request.json();
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 });
    }

    console.log('Converting manifest code:', code);

    const ghResp = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'glueops-app-manifest-converter'
      }
    });

    if (!ghResp.ok) {
      const text = await ghResp.text();
      console.error('GitHub conversion failed', ghResp.status, text);
      return new Response(JSON.stringify({ error: 'GitHub conversion failed', status: ghResp.status, body: text }), { status: 502 });
    }

    const data = await ghResp.json();
    console.log('Manifest conversion success. App slug:', data.slug, 'App ID:', data.id);

    // Never log private key contents fully in production; partial log only.
    if (data.pem) {
      console.log('Private key (first 80 chars):', data.pem.substring(0, 80) + '...');
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Unexpected error converting manifest:', err);
    return new Response(JSON.stringify({ error: 'Server error', detail: err?.message }), { status: 500 });
  }
};

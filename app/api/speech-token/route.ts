import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mint a short-lived Azure Speech authorization token using the server-side key.
// The browser runs continuous recognition with the token (not the key), so
// AZURE_SPEECH_KEY never reaches the client bundle. Token validity ~10 min.
// Light origin gate: blocks other sites' browsers from minting tokens.
// (Direct curl with no Origin is still allowed; the Azure budget cap is the
// hard backstop on spend.)
const ALLOWED_ORIGIN_PARTS = [
  'arnork.com',
  'wordbank-kappa.vercel.app',
  'localhost',
  '127.0.0.1',
  '100.122.205.30',
  'nithiwats-mac-mini',
];

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  if (origin && !ALLOWED_ORIGIN_PARTS.some((p) => origin.includes(p))) {
    return NextResponse.json({ error: 'origin not allowed' }, { status: 403 });
  }
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return NextResponse.json({ error: 'Azure Speech not configured' }, { status: 500 });
  }
  try {
    const r = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });
    if (!r.ok) {
      return NextResponse.json({ error: `token issue failed (${r.status})` }, { status: 502 });
    }
    const token = await r.text();
    return NextResponse.json({ token, region });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

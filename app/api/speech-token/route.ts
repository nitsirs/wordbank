import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mint a short-lived Azure Speech authorization token using the server-side key.
// The browser then runs continuous recognition with the token (not the key), so
// AZURE_SPEECH_KEY never reaches the client bundle. Token validity ~10 min.
// TODO before public deploy: gate this route (an open endpoint lets anyone mint
// tokens and burn the STT quota).
export async function GET() {
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

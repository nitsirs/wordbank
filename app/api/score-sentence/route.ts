import { NextRequest, NextResponse } from 'next/server';
import { assessPronunciation } from '@/services/pronunciationAssessment';
import { pronToGrade } from '@/lib/scoreRubric';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Score a recorded sentence (POST: { audio: <base64 wav>, reference: <string>, lang? }).
// Returns PA scores + the RT 0-3 grade. Key stays server-side.
export async function POST(req: NextRequest) {
  let body: { audio?: string; reference?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { audio, reference, lang } = body;
  if (!audio || !reference) {
    return NextResponse.json({ error: 'audio + reference required' }, { status: 400 });
  }
  try {
    const buf = Buffer.from(audio, 'base64');
    const result = await assessPronunciation(buf, reference, lang || 'th-TH');
    return NextResponse.json({ ...result, grade: pronToGrade(result.pron) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

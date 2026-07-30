// Bounded PA calibration on TTS sentences (run: source .env.local then node this).
// Confirms sentence-level PronScore + Fluency/Completeness populate + that correct
// speech lands grade 3. ~3 synth + 3 PA calls = trivial cost.
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import fs from 'fs';

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) { console.error('set AZURE_SPEECH_KEY/REGION'); process.exit(1); }

function synth(text, out) {
  return new Promise((res, rej) => {
    const c = sdk.SpeechConfig.fromSubscription(KEY, REGION);
    c.speechSynthesisVoiceName = 'th-TH-PremwadeeNeural';
    c.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
    const s = new sdk.SpeechSynthesizer(c);
    s.speakTextAsync(text, (r) => { fs.writeFileSync(out, Buffer.from(r.audioData)); s.close(); setTimeout(res, 100); }, rej);
  });
}
function assess(wav, ref) {
  return new Promise((res) => {
    const sc = sdk.SpeechConfig.fromSubscription(KEY, REGION);
    sc.speechRecognitionLanguage = 'th-TH';
    const push = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1));
    const buf = fs.readFileSync(wav);
    const di = buf.indexOf('data');
    push.write(buf.subarray(di + 8));
    push.close();
    const rec = new sdk.SpeechRecognizer(sc, sdk.AudioConfig.fromStreamInput(push));
    const pa = new sdk.PronunciationAssessmentConfig(ref, sdk.PronunciationAssessmentGradingSystem.HundredMark, sdk.PronunciationAssessmentGranularity.Phoneme, true);
    pa.applyTo(rec);
    rec.recognizeOnceAsync((r) => {
      const j = JSON.parse(r.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult) || '{}');
      const top = (j.NBest || [])[0] || {};
      const p = top.PronunciationAssessment || {};
      rec.close();
      res({ pron: p.PronScore, acc: p.AccuracyScore, fluen: p.FluencyScore, compl: p.CompletenessScore, words: (p.Words || []).length, heard: j.DisplayText || top.Lexical });
    }, (e) => { console.error(e); res({}); });
  });
}

const S = ['แม่ทำกับข้าว', 'นกบินกลับรัง', 'พ่ออ่านหนังสือ'];
console.log('calibrating', S.length, 'sentences…\n');
for (const s of S) {
  await synth(s, '/tmp/cs.wav');
  const r = await assess('/tmp/cs.wav', s);
  const g = r.pron >= 85 ? 3 : r.pron >= 70 ? 2 : r.pron >= 50 ? 1 : 0;
  console.log(`"${s}"\n  pron=${r.pron} acc=${r.acc} fluency=${r.fluen} compl=${r.compl} words=${r.words} → grade ${g}  heard="${r.heard}"\n`);
}

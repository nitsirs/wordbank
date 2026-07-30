import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface PAWord {
  word: string;
  accuracy: number;
  errorType: string;
}
export interface PAResult {
  recognizedText: string;
  accuracy: number;
  fluency: number;
  completeness: number;
  pron: number;
  words: PAWord[];
}

// Shape of the SDK's SpeechServiceResponse_JsonResult (only the fields we read).
interface PARaw {
  DisplayText?: string;
  NBest?: {
    Lexical?: string;
    PronunciationAssessment?: {
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      PronScore?: number;
      Words?: { Word: string; PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string } }[];
    };
  }[];
}

function stripWavHeader(buf: Buffer): Buffer {
  const idx = buf.indexOf('data');
  if (idx < 0) return buf;
  return buf.subarray(idx + 8);
}

/**
 * Server-side Pronunciation Assessment for a single utterance (word or sentence).
 * audioWav = Buffer of a 16kHz mono 16-bit WAV. Key stays server-side.
 * Single-shot recognizeOnce (suitable for one sentence; use continuous mode for >30s).
 */
export async function assessPronunciation(
  audioWav: Buffer,
  referenceText: string,
  lang = 'th-TH'
): Promise<PAResult> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error('Azure Speech not configured');

  const sc = sdk.SpeechConfig.fromSubscription(key, region);
  sc.speechRecognitionLanguage = lang;

  const push = sdk.AudioInputStream.createPushStream(
    sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
  );
  // copy into a fresh contiguous buffer so .buffer is an exact ArrayBuffer (SDK
  // write wants ArrayBuffer; a subarray's .buffer would include the header bytes).
  const pcm = Buffer.from(stripWavHeader(audioWav));
  push.write(pcm.buffer as ArrayBuffer);
  push.close();

  const recognizer = new sdk.SpeechRecognizer(sc, sdk.AudioConfig.fromStreamInput(push));
  const pa = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true // enableMiscue (OK for single utterance)
  );
  pa.applyTo(recognizer);

  try {
    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) =>
      recognizer.recognizeOnceAsync(resolve, reject)
    );
    const json = JSON.parse(
      result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult) || '{}'
    ) as PARaw;
    const top = (json.NBest ?? [])[0];
    const pao = top?.PronunciationAssessment;
    const words: PAWord[] = (pao?.Words ?? []).map((w) => ({
      word: w.Word,
      accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
      errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
    }));
    return {
      recognizedText: json.DisplayText || top?.Lexical || '',
      accuracy: pao?.AccuracyScore ?? 0,
      fluency: pao?.FluencyScore ?? 0,
      completeness: pao?.CompletenessScore ?? 0,
      pron: pao?.PronScore ?? 0,
      words,
    };
  } finally {
    recognizer.close();
  }
}

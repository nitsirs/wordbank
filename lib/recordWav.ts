/**
 * Browser WAV recorder: captures mic → 16kHz mono 16-bit PCM → WAV Blob for POSTing
 * to /api/score-sentence. Uses ScriptProcessorNode (deprecated but universal) for
 * simplicity; AudioWorklet is the modern replacement for later.
 */

export interface Recorder {
  stop: () => Promise<Blob>;
}

export type AutoStopReason = 'silence' | 'maxDuration' | 'timeout';

export interface VadOptions {
  /** RMS above this counts a chunk as voiced. getUserMedia noise suppression is on, so room noise sits well below this. */
  speechRms?: number;
  /** consecutive voiced chunks (each ~256ms at 16kHz/4096) needed before we consider speech "started" */
  minSpeechChunks?: number;
  /** consecutive silent chunks after speech started that trigger auto-stop */
  silenceChunksToStop?: number;
  /** hard cap on total recording length, in case silence never registers */
  maxRecordMs?: number;
  /** give up (no score call) if no speech is ever detected within this long */
  maxSilenceWaitMs?: number;
  /** fires once when the VAD decides to stop; caller drives the actual stop() + scoring */
  onAutoStop?: (reason: AutoStopReason) => void;
}

function writeStr(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export async function startRecorder(sampleRate = 16000, vad?: VadOptions): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const ctx = new AudioContext({ sampleRate });
  const src = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  const {
    speechRms = 0.02,
    minSpeechChunks = 2,
    silenceChunksToStop = 4,
    maxRecordMs = 10000,
    maxSilenceWaitMs = 6000,
    onAutoStop,
  } = vad ?? {};

  let voicedChunks = 0;
  let silentChunksSinceSpeech = 0;
  let speechStarted = false;
  let stopped = false;
  const startedAt = Date.now();
  let maxDurationTimer: ReturnType<typeof setTimeout> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  const fireAutoStop = (reason: AutoStopReason) => {
    if (stopped || !onAutoStop) return;
    stopped = true;
    clearTimeout(maxDurationTimer);
    clearTimeout(timeoutTimer);
    onAutoStop(reason);
  };

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    if (!onAutoStop || stopped) return;

    let sumSq = 0;
    for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
    const rms = Math.sqrt(sumSq / data.length);
    const voiced = rms >= speechRms;

    if (!speechStarted) {
      voicedChunks = voiced ? voicedChunks + 1 : 0;
      if (voicedChunks >= minSpeechChunks) speechStarted = true;
      if (!speechStarted && Date.now() - startedAt >= maxSilenceWaitMs) fireAutoStop('timeout');
      return;
    }

    silentChunksSinceSpeech = voiced ? 0 : silentChunksSinceSpeech + 1;
    if (silentChunksSinceSpeech >= silenceChunksToStop) fireAutoStop('silence');
  };
  src.connect(processor);
  processor.connect(ctx.destination);

  if (onAutoStop) {
    maxDurationTimer = setTimeout(() => fireAutoStop('maxDuration'), maxRecordMs);
  }

  return {
    stop: async () => {
      stopped = true;
      clearTimeout(maxDurationTimer);
      clearTimeout(timeoutTimer);
      try {
        processor.disconnect();
        src.disconnect();
      } catch {}
      stream.getTracks().forEach((t) => t.stop());
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(total);
      for (let i = 0, off = 0; i < chunks.length; i++) {
        merged.set(chunks[i], off);
        off += chunks[i].length;
      }
      const wav = encodeWav(merged, sampleRate);
      try {
        await ctx.close();
      } catch {}
      return new Blob([wav], { type: 'audio/wav' });
    },
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // base64 in chunks to avoid call-stack limits on large audio
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

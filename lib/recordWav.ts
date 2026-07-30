/**
 * Browser WAV recorder: captures mic → 16kHz mono 16-bit PCM → WAV Blob for POSTing
 * to /api/score-sentence. Uses ScriptProcessorNode (deprecated but universal) for
 * simplicity; AudioWorklet is the modern replacement for later.
 */

export interface Recorder {
  stop: () => Promise<Blob>;
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

export async function startRecorder(sampleRate = 16000): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const ctx = new AudioContext({ sampleRate });
  const src = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  src.connect(processor);
  processor.connect(ctx.destination);

  return {
    stop: async () => {
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

// lib/transcribe.ts
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { resolveFfmpegPath } from "./ffmpeg_path";

ffmpeg.setFfmpegPath(resolveFfmpegPath());

export async function decodeToPcm16k(
  input: Buffer | Uint8Array,
): Promise<Float32Array> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  return new Promise((resolve, reject) => {
    const source = new PassThrough();
    source.end(buffer);

    const chunks: Buffer[] = [];
    const output = new PassThrough();
    output.on("data", (chunk) => chunks.push(chunk));
    output.on("end", () => {
      const raw = Buffer.concat(chunks);
      const sampleCount = raw.length / 2;
      const float32 = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        float32[i] = raw.readInt16LE(i * 2) / 32768;
      }
      resolve(float32);
    });
    output.on("error", reject);

    ffmpeg(source)
      .audioChannels(1)
      .audioFrequency(16000)
      .format("s16le")
      .on("error", reject)
      .pipe(output);
  });
}

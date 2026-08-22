import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { resolveFfmpegPath } from "./ffmpeg_path";

ffmpeg.setFfmpegPath(resolveFfmpegPath());

/**
 * Extracts the audio track from a video buffer and returns it as a
 * 16kHz mono WAV buffer, ready to feed into the same decode/transcribe
 * pipeline used for uploaded audio files.
 */
export async function extractAudioFromVideo(
  videoBuffer: Buffer,
  originalName = "input",
): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg binary not found (ffmpeg-static). Check your deployment config.",
    );
  }

  const dir = await mkdtemp(path.join(tmpdir(), "meeting-video-"));
  const ext = path.extname(originalName) || ".mp4";
  const inputPath = path.join(dir, `input${ext}`);
  const outputPath = path.join(dir, "output.wav");

  try {
    await writeFile(inputPath, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("pcm_s16le")
        .format("wav")
        .on("error", (err) =>
          reject(new Error(`ffmpeg audio extraction failed: ${err.message}`)),
        )
        .on("end", () => resolve())
        .save(outputPath);
    });

    return await readFile(outputPath);
  } finally {
    // best-effort cleanup, don't let cleanup errors mask real failures
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

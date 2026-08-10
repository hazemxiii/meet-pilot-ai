import type { AutomaticSpeechRecognitionPipeline } from "@xenova/transformers";
import fs from "node:fs/promises";

process.env.ORT_LOG_SEVERITY_LEVEL ??= "3";
process.env.ORT_LOG_VERBOSITY_LEVEL ??= "0";

const WHISPER_MODEL = "Xenova/whisper-small";

let whisperPipelinePromise:
  | Promise<AutomaticSpeechRecognitionPipeline>
  | null = null;

async function readPcm16WavAsFloat32(audioPath: string) {
  const buffer = await fs.readFile(audioPath);

  if (buffer.length < 44) {
    throw new Error("Invalid audio file.");
  }

  const riffHeader = buffer.toString("ascii", 0, 4);
  const waveHeader = buffer.toString("ascii", 8, 12);

  if (riffHeader !== "RIFF" || waveHeader !== "WAVE") {
    throw new Error("Invalid audio file.");
  }

  let offset = 12;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    offset += 8;

    if (chunkId === "fmt ") {
      if (offset + 16 > buffer.length) {
        throw new Error("Invalid audio file.");
      }

      const audioFormat = buffer.readUInt16LE(offset);
      const channels = buffer.readUInt16LE(offset + 2);
      const bitsPerSample = buffer.readUInt16LE(offset + 14);

      if (
        audioFormat !== 1 ||
        channels < 1 ||
        bitsPerSample !== 16
      ) {
        throw new Error(
          "Audio must be PCM 16-bit WAV.",
        );
      }
    }

    if (chunkId === "data") {
      dataOffset = offset;
      dataLength = chunkSize;
      break;
    }

    offset += chunkSize + (chunkSize % 2);
  }

  if (
    dataOffset < 0 ||
    dataOffset + dataLength > buffer.length
  ) {
    throw new Error("Invalid audio file.");
  }

  const sampleCount = Math.floor(dataLength / 2);
  const waveform = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index++) {
    waveform[index] =
      buffer.readInt16LE(dataOffset + index * 2) / 32768;
  }

  return waveform;
}

async function getWhisperPipeline() {
  if (!whisperPipelinePromise) {
    whisperPipelinePromise = (async () => {
      console.log(
        `[Whisper] Loading model: ${WHISPER_MODEL}`,
      );

      try {
        const { pipeline } = await import(
          "@xenova/transformers"
        );

        const transcriber = await pipeline(
          "automatic-speech-recognition",
          WHISPER_MODEL,
        );

        console.log(
          "[Whisper] Model loaded successfully.",
        );

        return transcriber as AutomaticSpeechRecognitionPipeline;
      } catch (error) {
        console.error(
          "[Whisper] Failed to load model:",
          error,
        );

        // Important:
        // Allow retrying on the next request.
        whisperPipelinePromise = null;

        throw error;
      }
    })();
  }

  return whisperPipelinePromise;
}

export async function transcribeAudioFile(
  audioPath: string,
): Promise<string> {
  console.log(
    `[Whisper] Starting transcription: ${audioPath}`,
  );

  try {
    const waveform =
      await readPcm16WavAsFloat32(audioPath);

    console.log(
      `[Whisper] Audio samples: ${waveform.length}`,
    );

    if (waveform.length === 0) {
      throw new Error("Empty audio.");
    }

    const transcriber =
      await getWhisperPipeline();

    console.log("[Whisper] Running inference...");

    const result = await transcriber(waveform, {
      task: "transcribe",

      // Whisper will automatically detect the language.
      // This allows both Arabic and English.
      language: undefined,

      chunk_length_s: 30,
      stride_length_s: 5,

      return_timestamps: false,
    });

    console.log("[Whisper] Inference completed.");

    const text =
      Array.isArray(result)
        ? result
            .map((segment) => segment.text)
            .join(" ")
        : result.text;

    if (typeof text !== "string") {
      throw new Error("Empty transcript.");
    }

    const transcript = text.trim();

    if (!transcript) {
      throw new Error("Empty transcript.");
    }

    console.log(
      `[Whisper] Transcript length: ${transcript.length}`,
    );

    return transcript;
  } catch (error) {
    console.error(
      "[Whisper] Transcription error:",
      error,
    );

    // Keep the original error so we can see
    // the actual problem in the terminal.
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Whisper transcription failed.",
    );
  }
}

import { transcribeAudioFile } from "@/lib/transcription";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv"]);

const SUPPORTED_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
]);

const TRANSCRIPT_BUCKET = "files";

function splitIntoChunks(text: string, chunkSize = 500, overlap = 75) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) {
      break;
    }
    start = end - overlap;
  }
  return chunks;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getUser(request: Request, supabase: SupabaseClient) {
  const authHeader = request.headers.get("authorization");

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return supabase.auth.getUser(token ?? undefined);
}

function isSupportedVideo(file: File) {
  const fileExtension = path.extname(file.name).toLowerCase();

  return (
    SUPPORTED_EXTENSIONS.has(fileExtension) ||
    SUPPORTED_MIME_TYPES.has(file.type)
  );
}

async function resolveFfmpegBinary() {
  const candidates = [
    typeof ffmpegPath === "string" ? ffmpegPath : null,

    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function runFfmpeg(inputPath: string, outputPath: string) {
  const binaryPath = await resolveFfmpegBinary();

  if (!binaryPath) {
    throw new HttpError(500, "FFmpeg is not available on this server.");
  }

  return new Promise<void>((resolve, reject) => {
    const processHandle = spawn(binaryPath, [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ]);

    let stderr = "";

    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    processHandle.on("error", (error) => {
      console.error("FFmpeg spawn error:", error);

      reject(new HttpError(422, "Failed to process the uploaded video."));
    });

    processHandle.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      console.error("FFmpeg stderr:", stderr);

      if (
        /Output file does not contain any stream|Output file #0 does not contain any stream|Stream map '0:a:0'|Stream specifier '0:a:0'|matches no streams/i.test(
          stderr,
        )
      ) {
        reject(
          new HttpError(
            422,
            "The uploaded video does not contain an audio track.",
          ),
        );

        return;
      }

      if (
        /Invalid data found when processing input|moov atom not found|error opening input file|Could not find codec parameters|Decoder .* not found|Error while opening decoder|Invalid argument/i.test(
          stderr,
        )
      ) {
        reject(
          new HttpError(422, "The uploaded video is invalid or corrupted."),
        );

        return;
      }

      reject(new HttpError(422, "Failed to process the uploaded video."));
    });
  });
}

async function removeStorageObject(
  supabase: SupabaseClient,
  storagePath: string,
) {
  const { error } = await supabase.storage
    .from(TRANSCRIPT_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("Failed to remove orphaned transcript file:", error);
  }
}

// POST /api/meetings/transcribe-video
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await getUser(request, supabase);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tempDir = "";
  let uploadedStoragePath: string | null = null;

  try {
    const formData = await request.formData();

    const videoEntry = formData.get("video");

    if (!videoEntry || !(videoEntry instanceof File)) {
      throw new HttpError(400, "Missing video file.");
    }

    if (!isSupportedVideo(videoEntry)) {
      throw new HttpError(
        400,
        "Invalid video format. Use MP4, WebM, MOV, or MKV.",
      );
    }

    if (videoEntry.size > MAX_VIDEO_SIZE_BYTES) {
      throw new HttpError(413, "Video file is too large.");
    }

    // ========================================
    // 1. Create Meeting
    // ========================================

    const now = new Date().toISOString();

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        user_id: user.id,
        title: "Uploaded Meeting",
        transcript: "",
        time: now,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (meetingError || !meeting) {
      console.error("Failed to create meeting:", meetingError);

      throw new HttpError(500, "Failed to create meeting.");
    }

    const meetingId = meeting.id;

    console.log(`[Meeting] Created meeting: ${meetingId}`);

    // ========================================
    // 2. Create temp directory
    // ========================================

    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "meet-pilot-transcribe-"),
    );

    const inputExtension =
      path.extname(videoEntry.name).toLowerCase() || ".mp4";

    const inputPath = path.join(tempDir, `video${inputExtension}`);

    const audioPath = path.join(tempDir, "audio.wav");

    await fs.writeFile(inputPath, Buffer.from(await videoEntry.arrayBuffer()));

    // ========================================
    // 3. Extract audio
    // ========================================

    console.log("[Transcription] Extracting audio...");

    await runFfmpeg(inputPath, audioPath);

    const audioStats = await fs.stat(audioPath);

    if (audioStats.size === 0) {
      throw new HttpError(
        422,
        "The uploaded video does not contain usable audio.",
      );
    }

    console.log(`[Transcription] Audio extracted: ${audioStats.size} bytes`);

    // ========================================
    // 4. Whisper transcription
    // ========================================

    let transcriptText: string;

    try {
      transcriptText = await transcribeAudioFile(audioPath);

      console.log("========== TRANSCRIPT ==========");

      console.log(transcriptText);

      console.log("================================");
    } catch (error) {
      console.error("[Transcription] Error:", error);

      const message = error instanceof Error ? error.message : "";

      if (/model|pipeline|load/i.test(message)) {
        throw new HttpError(503, "Whisper model is not available right now.");
      }

      if (/Empty audio|Empty transcript/i.test(message)) {
        throw new HttpError(
          422,
          "The uploaded audio produced an empty transcript.",
        );
      }

      if (/Invalid audio file|corrupted/i.test(message)) {
        throw new HttpError(422, "The uploaded audio is invalid or corrupted.");
      }

      throw new HttpError(422, "Failed to transcribe the uploaded audio.");
    }

    if (!transcriptText.trim()) {
      throw new HttpError(422, "No transcript was returned.");
    }

    // ========================================
    // 5. Update Meeting with transcript
    // ========================================

    const { error: updateMeetingError } = await supabase
      .from("meetings")
      .update({
        transcript: transcriptText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", meetingId)
      .eq("user_id", user.id);

    if (updateMeetingError) {
      console.error("Failed to update meeting transcript:", updateMeetingError);

      throw new HttpError(500, "Failed to save meeting transcript.");
    }

    // ========================================
    // 5.5. Generate chunks and embeddings
    // ========================================

    const generateEmbedding = await pipeline(
      "feature-extraction",
      "Supabase/gte-small",
    );

    const chunks = splitIntoChunks(transcriptText || "");
    let chunkIndex = 0;
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk, {
        pooling: "mean",
        normalize: true,
      });
      const { error: chunkError } = await supabase
        .from("meeting_chunks")
        .insert({
          user_id: user.id,
          meeting_id: meetingId,
          text: chunk,
          embedding: Array.from(embedding.data),
          chunk_index: chunkIndex++,
        });
      if (chunkError) {
        console.error("Chunk insert error:", chunkError);
      }
    }

    // ========================================
    // 6. Upload transcript to Storage
    // ========================================

    const uniqueId = crypto.randomUUID();

    const storagePath = `${user.id}/${meetingId}/transcript-${uniqueId}.txt`;

    const transcriptBuffer = Buffer.from(transcriptText, "utf8");

    console.log(`[Storage] Uploading transcript: ${storagePath}`);

    const { error: uploadError } = await supabase.storage
      .from(TRANSCRIPT_BUCKET)
      .upload(storagePath, transcriptBuffer, {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadError) {
      console.error("Transcript upload failed:", uploadError);

      throw new HttpError(500, "Failed to save the transcript file.");
    }

    uploadedStoragePath = storagePath;

    // ========================================
    // 7. Save file metadata
    // ========================================

    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .insert({
        meeting_id: meetingId,
        mime_type: "text/plain",
        file_path: storagePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, meeting_id, mime_type, file_path")
      .single();

    if (fileError || !fileRecord) {
      console.error("Transcript metadata insert failed:", fileError);

      throw new HttpError(500, "Failed to save transcript metadata.");
    }

    // ========================================
    // 8. Success
    // ========================================

    console.log(`[Success] Transcript saved for meeting ${meetingId}`);

    return NextResponse.json(
      {
        success: true,

        meeting: {
          id: meetingId,
          title: "Uploaded Meeting",
        },

        transcript: {
          id: fileRecord.id,
          fileName: "transcript.txt",
          mimeType: fileRecord.mime_type,
          path: fileRecord.file_path,
          meetingId: fileRecord.meeting_id,
          text: transcriptText,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (uploadedStoragePath) {
      await removeStorageObject(supabase, uploadedStoragePath);
    }

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    console.error("POST /api/meetings/transcribe-video error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  } finally {
    if (tempDir) {
      await fs
        .rm(tempDir, {
          recursive: true,
          force: true,
        })
        .catch(() => {});
    }
  }
}

// app/api/meetings/upload/route.ts
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { upsertMeetingWithEmbeddings } from "@/lib/meetings";
import { decodeToPcm16k } from "@/lib/transcribe";
import { extractAudioFromVideo } from "@/lib/video";

export const runtime = "nodejs"; // @xenova/transformers needs Node, not edge
export const maxDuration = 300; // transcription of longer files can take a while

async function transcribeBuffer(buffer: Buffer): Promise<string> {
  const { pipeline } = await import("@xenova/transformers");
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-small.en",
  );
  const pcm = await decodeToPcm16k(buffer);
  const result = await transcriber(pcm, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  return Array.isArray(result)
    ? result.map((r) => r.text).join(" ")
    : result.text;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let transcriptText: string;

    if (file.type.startsWith("text/")) {
      transcriptText = await file.text();
    } else if (file.type.startsWith("audio/")) {
      transcriptText = await transcribeBuffer(
        Buffer.from(await file.arrayBuffer()),
      );
    } else if (file.type.startsWith("video/")) {
      const audioFile = await extractAudioFromVideo(
        Buffer.from(await file.arrayBuffer()),
        file.name,
      );
      transcriptText = await transcribeBuffer(audioFile);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 },
      );
    }

    const meeting = await upsertMeetingWithEmbeddings(supabase, user.id, {
      title: title || file.name,
      transcriptText,
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error("POST /api/meetings/upload error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

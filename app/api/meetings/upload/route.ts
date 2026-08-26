import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

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
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const meetingTitle =
      title && title.trim() ? title.trim() : "Uploaded Meeting Recording";
    const meetingTime = new Date().toISOString();

    // Prepare FormData for the AI API
    const aiFormData = new FormData();
    aiFormData.append("file", file);
    aiFormData.append("model", "whisper-1"); // Standard whisper model parameter

    const url = process.env.AI_BASE_URL + "/audio/transcriptions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: aiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to transcribe via AI API:", errorText);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 },
      );
    }

    const data = await response.json();
    const transcriptText = data.text; // Assuming standard OpenAI API response format { text: "..." }

    if (!transcriptText) {
      return NextResponse.json(
        { error: "Empty transcription received" },
        { status: 500 },
      );
    }

    // Insert into meetings table
    const { data: resultMeeting, error } = await supabase
      .from("meetings")
      .insert({
        user_id: user.id,
        title: meetingTitle,
        transcript: JSON.stringify([transcriptText]), // Store as JSON array if needed, but text is fine too. Let's just store as text string like existing code sometimes does, wait, the existing UI parses it as JSON sometimes. Let's look at how UI parses it.
        time: meetingTime,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    const meetingId = resultMeeting.id;

    // Generate embeddings and chunks
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
      const { data: chunkData, error: chunkError } = await supabase
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

    return NextResponse.json({ meeting: resultMeeting }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/meetings/upload error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

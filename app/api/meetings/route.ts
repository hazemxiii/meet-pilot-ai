import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

export async function POST(request: Request) {
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
  let title = formData.get("title");
  if (!title) {
    title = "Untitled Meeting";
  }
  const time = new Date();
  const userId = user.id;
  let transcript = formData.get("transcript") as string | null | undefined;
  if (!transcript) {
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type === "text/plain") {
      transcript = await file.text();
    }
  }
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title,
      transcript: transcript || "",
      time,
      user_id: userId,
    })
    .select();

  const generateEmbedding = await pipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const chunks = splitIntoChunks(transcript || "");
  let chunkIndex = 0;
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk, {
      pooling: "mean",
      normalize: true,
    });
    const { data: chunkData, error: chunkError } = await supabase
      .from("meeting_chunks")
      .insert({
        user_id: userId,
        meeting_id: data?.[0]?.id,
        text: chunk,
        embedding: Array.from(embedding.data),
        chunk_index: chunkIndex++,
      });
    console.log("Chunk inserted:", chunkData, chunkError);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

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

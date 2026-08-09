import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pipeline } from "@xenova/transformers";
import { use } from "react";

// export async function POST(request: Request) {
//   const cookieStore = await cookies();
//   const supabase = createClient(cookieStore);

//   const {
//     data: { user },
//     error: userError,
//   } = await supabase.auth.getUser();

//   if (userError || !user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const formData = await request.formData();
//   let title = formData.get("title");
//   if (!title) {
//     title = "Untitled Meeting";
//   }
//   const time = new Date();
//   const userId = user.id;
//   let transcript = formData.get("transcript") as string | null | undefined;
//   if (!transcript) {
//     const file = formData.get("file") as File;
//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }
//     if (file.type === "text/plain") {
//       transcript = await file.text();
//     }
//   }
//   const { data, error } = await supabase
//     .from("meetings")
//     .insert({
//       title,
//       transcript: transcript || "",
//       time,
//       user_id: userId,
//     })
//     .select();

//   const generateEmbedding = await pipeline(
//     "feature-extraction",
//     "Supabase/gte-small",
//   );

//   const chunks = splitIntoChunks(transcript || "");
//   let chunkIndex = 0;
//   for (const chunk of chunks) {
//     const embedding = await generateEmbedding(chunk, {
//       pooling: "mean",
//       normalize: true,
//     });
//     const { data: chunkData, error: chunkError } = await supabase
//       .from("meeting_chunks")
//       .insert({
//         user_id: userId,
//         meeting_id: data?.[0]?.id,
//         text: chunk,
//         embedding: Array.from(embedding.data),
//         chunk_index: chunkIndex++,
//       });
//     console.log("Chunk inserted:", chunkData, chunkError);
//   }

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }

//   return NextResponse.json(data);
// }

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

// The Chrome extension authenticates with a Bearer token (it has no cookies),
// while the website uses cookie sessions. Resolve the user from either source.
async function getUser(request: Request, supabase: SupabaseClient) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return supabase.auth.getUser(token ?? undefined);
}

// GET /api/meetings - Fetch meetings from Supabase DB for logged in user
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await getUser(request, supabase);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[%_,()]/g, "");
      query = query.ilike("title", `%${safeSearch}%`);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error("Supabase error listing meetings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ meetings: meetings || [] });
  } catch (err: unknown) {
    console.error("GET /api/meetings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/meetings - Save or update meeting transcript from Chrome Extension / UI
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // TODO debug
    // const {
    //   data: { user },
    //   error: userError,
    // } = await getUser(request, supabase);

    const user = { id: "ba21ea18-b44e-43b6-87e1-9f909584621c" };
    const userError = null;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, transcript, time } = body;

    // Validate payload
    const meetingTitle =
      title && typeof title === "string" && title.trim()
        ? title.trim()
        : "Google Meet Recording";
    const transcriptText = Array.isArray(transcript)
      ? JSON.stringify(transcript)
      : typeof transcript === "string"
        ? transcript
        : "";
    const meetingTime = time
      ? new Date(time).toISOString()
      : new Date().toISOString();

    // Check if meeting with this title/time or ID exists to update or insert
    const { data: existingMeeting } = await supabase
      .from("meetings")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", meetingTitle)
      .limit(1)
      .maybeSingle();

    let resultMeeting;
    let meetingId;
    if (existingMeeting) {
      meetingId = existingMeeting.id;
      const { data, error } = await supabase
        .from("meetings")
        .update({
          transcript: transcriptText,
          time: meetingTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMeeting.id)
        .select()
        .single();

      if (error) throw error;
      resultMeeting = data;
    } else {
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          user_id: user.id,
          title: meetingTitle,
          transcript: transcriptText,
          time: meetingTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      resultMeeting = data;
      meetingId = resultMeeting.id;
    }

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
          user_id: user.id,
          meeting_id: meetingId,
          text: chunk,
          embedding: Array.from(embedding.data),
          chunk_index: chunkIndex++,
        });
      console.log("Chunk inserted:", chunkData, chunkError);
    }

    return NextResponse.json({ meeting: resultMeeting }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/meetings error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

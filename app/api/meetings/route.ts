import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pipeline } from "@xenova/transformers";

// The Chrome extension authenticates with a Bearer token (it has no cookies),
// while the website uses cookie sessions. Resolve the user from either source.
async function getUser(request: Request, supabase: SupabaseClient) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return supabase.auth.getUser(token ?? undefined);
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/meetings - Save or update meeting transcript from Chrome Extension / UI
export async function POST(request: Request) {
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

    let meetingTitle = "Google Meet Recording";
    let transcriptText = "";
    let meetingTime = new Date().toISOString();

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { title, transcript, time } = body;
      
      meetingTitle = (title && typeof title === "string" && title.trim()) ? title.trim() : "Google Meet Recording";
      transcriptText = Array.isArray(transcript)
        ? JSON.stringify(transcript)
        : (typeof transcript === "string" ? transcript : "");
      if (time) {
        meetingTime = new Date(time).toISOString();
      }
    } else {
      // Support the old FormData upload format
      const formData = await request.formData();
      const title = formData.get("title");
      if (title && typeof title === "string" && title.trim()) {
        meetingTitle = title.trim();
      } else {
        meetingTitle = "Untitled Meeting";
      }

      let t = formData.get("transcript") as string | null | undefined;
      if (!t) {
        const file = formData.get("file") as File;
        if (!file) {
          return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (file.type === "text/plain") {
          t = await file.text();
        }
      }
      transcriptText = t || "";
    }

    // Check if a meeting with this exact title already exists to update it instead of duplicating
    const { data: existingMeeting } = await supabase
      .from("meetings")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", meetingTitle)
      .limit(1)
      .maybeSingle();

    let resultMeeting;
    if (existingMeeting) {
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
    }

    // --- EMBEDDING LOGIC ---
    // First, delete existing chunks for this meeting so live syncs don't duplicate them
    await supabase.from("meeting_chunks").delete().eq("meeting_id", resultMeeting.id);

    // Generate embeddings
    const generateEmbedding = await pipeline(
      "feature-extraction",
      "Supabase/gte-small",
    );

    const chunks = splitIntoChunks(transcriptText || "");
    let chunkIndex = 0;
    
    // We run chunks in sequence to avoid overloading the pipeline
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk, {
        pooling: "mean",
        normalize: true,
      });
      const { error: chunkError } = await supabase
        .from("meeting_chunks")
        .insert({
          user_id: user.id,
          meeting_id: resultMeeting.id,
          text: chunk,
          embedding: Array.from(embedding.data),
          chunk_index: chunkIndex++,
        });
        
      if (chunkError) {
        console.error("Chunk inserted error:", chunkError);
      }
    }

    return NextResponse.json({ meeting: resultMeeting }, { 
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  } catch (err: any) {
    console.error("POST /api/meetings error:", err);
    const msg = err?.message || JSON.stringify(err) || "Internal server error";
    return NextResponse.json({ error: msg, details: err }, { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

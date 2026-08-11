import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function splitIntoChunks(text: string, chunkSize = 500, overlap = 75) {
  const words = text.split(/\s+/).filter(Boolean);

  const chunks: string[] = [];

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

// Chrome Extension uses Bearer token.
// Website uses cookie session.
async function getUser(request: Request, supabase: SupabaseClient) {
  const authHeader = request.headers.get("authorization");

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return supabase.auth.getUser(token ?? undefined);
}

// GET /api/meetings
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await getUser(request, supabase);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const searchParams = new URL(request.url).searchParams;

    const search = searchParams.get("search");

    let query = supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (search) {
      const safeSearch = search.replace(/[%_,()]/g, "");

      query = query.ilike("title", `%${safeSearch}%`);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error("Supabase error listing meetings:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      meetings: meetings || [],
    });
  } catch (error) {
    console.error("GET /api/meetings error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}

// POST /api/meetings
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await getUser(request, supabase);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    const { title, transcript, time } = body;

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

    // ========================================
    // Check existing meeting
    // ========================================

    const { data: existingMeeting, error: existingMeetingError } =
      await supabase
        .from("meetings")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", meetingTitle)
        .limit(1)
        .maybeSingle();

    if (existingMeetingError) {
      throw existingMeetingError;
    }

    let resultMeeting;
    let meetingId: number;

    // ========================================
    // Update existing meeting
    // ========================================

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
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      resultMeeting = data;
    }

    // ========================================
    // Create new meeting
    // ========================================
    else {
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

      if (error) {
        throw error;
      }

      resultMeeting = data;
      meetingId = data.id;
    }

    // ========================================
    // Generate embeddings
    // ========================================

    if (transcriptText.trim()) {
      const { pipeline } = await import("@xenova/transformers");

      const generateEmbedding = await pipeline(
        "feature-extraction",
        "Supabase/gte-small",
      );

      const chunks = splitIntoChunks(transcriptText);

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
    }

    return NextResponse.json(
      {
        meeting: resultMeeting,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST /api/meetings error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

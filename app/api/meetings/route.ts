import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

    const body = await request.json();
    const { title, transcript, time, external_id } = body;

    // Validate payload
    const meetingTitle = (title && typeof title === "string" && title.trim()) ? title.trim() : "Google Meet Recording";
    const transcriptText = Array.isArray(transcript)
      ? JSON.stringify(transcript)
      : (typeof transcript === "string" ? transcript : "");
    const meetingTime = time ? new Date(time).toISOString() : new Date().toISOString();
    const externalId = (typeof external_id === "string" && external_id.trim())
      ? external_id.trim()
      : null;

    // The extension syncs the SAME session many times (live + finalize) —
    // look it up by its stable external_id so every POST updates one row
    // instead of accidentally creating a duplicate (or overwriting a
    // different meeting with the same title). Website-created meetings have
    // no external_id, so those keep matching on title as before.
    let existingMeeting;
    if (externalId) {
      const { data } = await supabase
        .from("meetings")
        .select("id")
        .eq("user_id", user.id)
        .eq("external_id", externalId)
        .maybeSingle();
      existingMeeting = data;
    }

    if (!existingMeeting) {
      const { data } = await supabase
        .from("meetings")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", meetingTitle)
        .limit(1)
        .maybeSingle();
      existingMeeting = data;
    }

    let resultMeeting;
    if (existingMeeting) {
      const { data, error } = await supabase
        .from("meetings")
        .update({
          transcript: transcriptText,
          time: meetingTime,
          updated_at: new Date().toISOString(),
          ...(externalId ? { external_id: externalId } : {}),
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
          ...(externalId ? { external_id: externalId } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      resultMeeting = data;
    }

    return NextResponse.json({ meeting: resultMeeting }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/meetings error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

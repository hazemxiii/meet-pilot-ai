import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/notes - List notes with optional filtering
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("notes")
      .select(`
        *,
        tags (
          id,
          name
        )
      `, { count: "exact" })
      .eq("user_id", user.id);

    // Apply search filter
    if (search) {
      const safeSearch = search.replace(/[%_,()]/g, "");
      query = query.or(`title.ilike.%${safeSearch}%,details.ilike.%${safeSearch}%`);
    }

    // Apply sorting
    const validSortFields = ["created_at", "updated_at", "title"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
    query = query.order(sortField, { ascending: sortOrder === "asc" });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: notes, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
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

    const body = await request.json();
    const { title, details = "", tags = [] } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create the note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: title.trim(),
        details: details?.trim() ?? "",
      })
      .select()
      .single();

    if (noteError) {
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Find or create tag
        let { data: tag } = await supabase
          .from("tags")
          .select()
          .eq("name", tagName)
          .single();

        if (!tag) {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({ name: tagName })
            .select()
            .single();
          tag = newTag;
        }

        // Link tag to note
        if (tag) {
          await supabase.from("note_tags").insert({
            note_id: note.id,
            tag_id: tag.id,
          });
        }
      }
    }

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/notes/bulk - Bulk create notes
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
    const { notes } = body;

    if (!Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json(
        { error: "Notes array is required" },
        { status: 400 }
      );
    }

    // Validate each note
    for (const note of notes) {
      if (!note.title || typeof note.title !== "string") {
        return NextResponse.json(
          { error: "Each note must have a title" },
          { status: 400 }
        );
      }
    }

    // Prepare notes for insertion
    const notesToInsert = notes.map((note) => ({
      user_id: user.id,
      title: note.title.trim(),
      details: note.details?.trim() ?? "",
    }));

    const { data: createdNotes, error } = await supabase
      .from("notes")
      .insert(notesToInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(createdNotes, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/bulk - Bulk delete notes
export async function DELETE(request: Request) {
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
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "Note IDs are required" },
        { status: 400 }
      );
    }

    const noteIds = ids.split(",");

    // Delete note_tags associations first (cascade may not be configured)
    const { error: tagLinkError } = await supabase
      .from("note_tags")
      .delete()
      .in("note_id", noteIds);

    if (tagLinkError) {
      return NextResponse.json(
        { error: tagLinkError.message },
        { status: 500 }
      );
    }

    // Delete the notes
    const { error } = await supabase
      .from("notes")
      .delete()
      .in("id", noteIds)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedCount: noteIds.length });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

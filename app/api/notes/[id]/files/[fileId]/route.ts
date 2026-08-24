import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// DELETE /api/notes/[id]/files/[fileId] - Delete a file from a note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { id, fileId } = await params;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify note belongs to user
    const { data: note } = await supabase
      .from("notes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Get file record
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("note_id", id)
      .single();

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("files")
      .remove([fileRecord.file_path]);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// DELETE /api/meetings/bulk - Bulk delete meetings
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
        { error: "Meeting IDs are required" },
        { status: 400 }
      );
    }

    const meetingIds = ids.split(",");

    // Delete meeting_chunks associations first
    const { error: chunkError } = await supabase
      .from("meeting_chunks")
      .delete()
      .in("meeting_id", meetingIds);

    if (chunkError) {
      return NextResponse.json(
        { error: chunkError.message },
        { status: 500 }
      );
    }

    // Delete the meetings
    const { error } = await supabase
      .from("meetings")
      .delete()
      .in("id", meetingIds)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedCount: meetingIds.length });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

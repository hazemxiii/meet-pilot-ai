import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/tasks/bulk - Bulk create tasks
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
    const { tasks } = body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "Tasks array is required" },
        { status: 400 }
      );
    }

    // Validate each task
    for (const task of tasks) {
      if (!task.title || typeof task.title !== "string") {
        return NextResponse.json(
          { error: "Each task must have a title" },
          { status: 400 }
        );
      }
    }

    // Prepare tasks for insertion
    const tasksToInsert = tasks.map((task) => ({
      user_id: user.id,
      title: task.title.trim(),
      details: task.details?.trim() ?? "",
      done: task.done ?? false,
      deadline: task.deadline || null,
    }));

    const { data: createdTasks, error } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(createdTasks, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/bulk - Bulk delete tasks
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
        { error: "Task IDs are required" },
        { status: 400 }
      );
    }

    const taskIds = ids.split(",");

    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", taskIds)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedCount: taskIds.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/bulk - Bulk update tasks
export async function PATCH(request: Request) {
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
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Task IDs array is required" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Updates object is required" },
        { status: 400 }
      );
    }

    const allowedFields = ["title", "details", "done", "deadline"] as const;

    const safeUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    const { data: updatedTasks, error } = await supabase
      .from("tasks")
      .update(safeUpdates)
      .in("id", ids)
      .eq("user_id", user.id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedTasks);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

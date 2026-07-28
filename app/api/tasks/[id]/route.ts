import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/tasks/[id] - Get a single task with related data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch related data
    const [subtasks, checklists, dependencies, attachments] = await Promise.all([
      supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", id)
        .order("order_index", { ascending: true }),
      supabase
        .from("checklists")
        .select("*, checklist_items(*)")
        .eq("task_id", id),
      supabase
        .from("task_dependencies")
        .select("*, blocking_task:tasks!task_dependencies_blocking_task_id_fkey(*)")
        .eq("task_id", id),
      supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", id)
        .order("uploaded_at", { ascending: false }),
    ]);

    return NextResponse.json({
      task,
      subtasks: subtasks.data || [],
      checklists: checklists.data || [],
      dependencies: dependencies.data || [],
      attachments: attachments.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const {
      title,
      description,
      status,
      priority,
      assignees,
      start_date,
      due_date,
      time_estimate,
      sprint_points,
      tags,
    } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignees !== undefined) updateData.assignees = assignees;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (time_estimate !== undefined) updateData.time_estimate = time_estimate;
    if (sprint_points !== undefined) updateData.sprint_points = sprint_points;
    if (tags !== undefined) updateData.tags = tags;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

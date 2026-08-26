import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { data: chunks, error: chunksError } = await supabase
    .from("meeting_chunks")
    .select("*")
    .eq("meeting_id", id);
  if (chunksError) {
    return Response.json(
      {
        error:
          "Failed to analyse meeting error code " + "CHNK_" + chunksError.code,
      },
      { status: 500 },
    );
  }
  if (!chunks || chunks.length === 0) {
    return Response.json(
      {
        error: "Failed to analyse meeting no chunks found",
      },
      { status: 404 },
    );
  }
  if (chunks.some((chunk) => chunk.user_id !== user.id)) {
    return Response.json(
      {
        error:
          "Failed to analyse meeting you are not the owner of this meeting",
      },
      { status: 403 },
    );
  }

  // Fetch user memory items for context
  const { data: memoryItems, error: memoryError } = await supabase
    .from("memory_items")
    .select("content")
    .eq("user_id", user.id);

  const memoryContext =
    memoryItems && memoryItems.length > 0
      ? memoryItems.map((item) => item.content).join("\n")
      : "No previous memory context available.";

  const notes = [];
  const tasks = [];
  for (const chunk of chunks) {
    const url = process.env.AI_BASE_URL + "/student/chat";

    const payload = {
      model_id: "deepseek.v3.2",
      messages: [
        {
          role: "user",
          content: "Analyze this meeting chunk and provide a summary:",
        },
      ],
      system_prompt: `You are a helpful meeting assistant that analyzes meeting chunks and provides summaries.
        return the data as a json object with the following fields:
        {
        'notes':[
            {
                'title': 'title of the note',
                'description': 'description of the note'
            }
        ],
        'tasks':[
            {
                'title': 'title of the task',
                'description': 'description of the task',
                'deadline': 'deadline of the task as an iso string'
            }
        ]
        }

        make sure to return valid json only that can be parsed with JSON.parse() in typescript directly without any additional formatting or comments

        User Memory Context (previous notes and information):
        ${memoryContext}

        Current Meeting Chunk to Analyze:
        ${chunk.text}

        Take into account the user's previous memory context when generating notes and tasks from the meeting chunk.
        `,
      max_tokens: 500,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      continue;
    }
    const responseData = await response.json();
    let jsonParsed;
    let parseSuccess = false;
    const maxRetries = 3;

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      try {
        jsonParsed = JSON.parse(
          responseData.output_text.replace("```json", "").replace("```", ""),
        );
        parseSuccess = true;
        break;
      } catch (error) {
        if (retryCount === maxRetries - 1) {
          continue;
        }
      }
    }

    if (!parseSuccess) {
      continue;
    }

    notes.push(...jsonParsed.notes);
    tasks.push(...jsonParsed.tasks);
  }
  return NextResponse.json({
    notes,
    tasks,
  });
}

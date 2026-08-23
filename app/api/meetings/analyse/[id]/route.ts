import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type ChunkForAnalysis = {
  user_id: string;
  text: string;
};

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

function transcriptToPlainText(transcript: string) {
  const trimmed = transcript.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }

          if (entry && typeof entry === "object" && "text" in entry) {
            const text = (entry as { text?: unknown }).text;

            return typeof text === "string" ? text : "";
          }

          return "";
        })
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Transcript is plain text.
  }

  return trimmed;
}

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

  let chunksToAnalyze: ChunkForAnalysis[] = chunks || [];

  if (
    chunksToAnalyze.length > 0 &&
    chunksToAnalyze.some((chunk) => chunk.user_id !== user.id)
  ) {
    return Response.json(
      {
        error:
          "Failed to analyse meeting you are not the owner of this meeting",
      },
      { status: 403 },
    );
  }

  if (chunksToAnalyze.length === 0) {
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("user_id, transcript")
      .eq("id", id)
      .single();

    if (meetingError || !meeting) {
      return Response.json(
        {
          error: "Failed to analyse meeting meeting not found",
        },
        { status: 404 },
      );
    }

    if (meeting.user_id !== user.id) {
      return Response.json(
        {
          error:
            "Failed to analyse meeting you are not the owner of this meeting",
        },
        { status: 403 },
      );
    }

    const transcriptText = transcriptToPlainText(meeting.transcript || "");

    if (!transcriptText) {
      return Response.json(
        {
          error: "Failed to analyse meeting no transcript found",
        },
        { status: 422 },
      );
    }

    chunksToAnalyze = splitIntoChunks(transcriptText).map((text) => ({
      user_id: user.id,
      text,
    }));

    if (chunksToAnalyze.length === 0) {
      return Response.json(
        {
          error: "Failed to analyse meeting no chunks found",
        },
        { status: 422 },
      );
    }
  }

  const notes = [];
  const tasks = [];

  for (const chunk of chunksToAnalyze) {
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

        Context:
        ${chunk.text}
        
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

    try {
      jsonParsed = JSON.parse(
        responseData.output_text.replace("```json", "").replace("```", ""),
      );
    } catch {
      continue;
    }

    notes.push(...(Array.isArray(jsonParsed.notes) ? jsonParsed.notes : []));
    tasks.push(...(Array.isArray(jsonParsed.tasks) ? jsonParsed.tasks : []));
  }

  return NextResponse.json({
    notes,
    tasks,
  });
}

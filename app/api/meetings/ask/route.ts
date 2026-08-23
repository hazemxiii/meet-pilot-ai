import { createClient } from "@/utils/supabase/server";
import { pipeline } from "@xenova/transformers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
  let { meetingsIds } = body;
  const { prompt } = body;
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }
  meetingsIds = meetingsIds || [];
  if (!Array.isArray(meetingsIds)) {
    return NextResponse.json({ error: "Invalid meetingsIds" }, { status: 400 });
  }

  if (meetingsIds.length === 0) {
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", user.id);
    if (meetingsError) {
      return NextResponse.json(
        { error: "Failed to fetch meetings" },
        { status: 500 },
      );
    }
    meetingsIds = meetings.map((meeting) => meeting.id);
  }
  const generateEmbedding = await pipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const embedding = await generateEmbedding(prompt, {
    pooling: "mean",
    normalize: true,
  });

  const { data, error } = await supabase.rpc("match_meeting_chunks", {
    query_embedding: Array.from(embedding.data),
    match_threshold: 0.5,
    match_count: 5,
    filter_user_id: user.id,
  });

  const { data: memoryData, error: memoryError } = await supabase
    .from("memory_items")
    .select("content")
    .eq("user_id", user.id);

  const memoryContext = !memoryError && memoryData 
    ? memoryData.map((item: { content: string }) => item.content).join("\n") 
    : "";

  const url = process.env.AI_BASE_URL + "/student/chat";

  const payload = {
    model_id: "deepseek.v3.2",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system_prompt: `You are a helpful assistant that answers questions based on the provided context.
    
    User Memory (Important facts about the user):
    ${memoryContext ? memoryContext : "No memory available."}

    Context from meetings:
    ${data.map((chunk: { text: string }) => chunk.text).join("\n")}
    
    `,
    max_tokens: 300,
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
    return NextResponse.json(
      { error: "Failed to fetch response" },
      { status: 500 },
    );
  }
  const responseData = await response.json();
  return NextResponse.json({
    data: responseData.output_text,
  });
}

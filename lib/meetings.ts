import type { SupabaseClient } from "@supabase/supabase-js";

function splitIntoChunks(text: string, chunkSize = 500, overlap = 75) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}

let embedderPromise: ReturnType<typeof loadEmbedder> | null = null;
async function loadEmbedder() {
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Supabase/gte-small");
}
// Reuse the pipeline across requests instead of rebuilding it every call
function getEmbedder() {
  if (!embedderPromise) embedderPromise = loadEmbedder();
  return embedderPromise;
}

export async function upsertMeetingWithEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  {
    title,
    transcriptText,
    time,
  }: { title: string; transcriptText: string; time?: string },
) {
  const meetingTitle = title?.trim() || "Untitled Meeting";
  const meetingTime = time
    ? new Date(time).toISOString()
    : new Date().toISOString();

  const { data: existingMeeting, error: existingMeetingError } = await supabase
    .from("meetings")
    .select("id")
    .eq("user_id", userId)
    .eq("title", meetingTitle)
    .limit(1)
    .maybeSingle();

  if (existingMeetingError) throw existingMeetingError;

  let resultMeeting;
  let meetingId: number;

  if (existingMeeting) {
    meetingId = existingMeeting.id;
    const { data, error } = await supabase
      .from("meetings")
      .update({
        transcript: transcriptText,
        time: meetingTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMeeting.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    resultMeeting = data;
  } else {
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        user_id: userId,
        title: meetingTitle,
        transcript: transcriptText,
        time: meetingTime,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    resultMeeting = data;
    meetingId = data.id;
  }

  if (transcriptText.trim()) {
    const generateEmbedding = await getEmbedder();
    const chunks = splitIntoChunks(transcriptText);

    // insert in parallel-ish batches instead of one-by-one awaits if this gets slow
    let chunkIndex = 0;
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk, {
        pooling: "mean",
        normalize: true,
      });
      const { error: chunkError } = await supabase
        .from("meeting_chunks")
        .insert({
          user_id: userId,
          meeting_id: meetingId,
          text: chunk,
          embedding: Array.from(embedding.data),
          chunk_index: chunkIndex++,
        });
      if (chunkError) console.error("Chunk insert error:", chunkError);
    }
  }

  return resultMeeting;
}

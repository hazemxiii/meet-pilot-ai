"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Sparkles,
  MessageSquare,
  Loader2,
  Check,
  X,
  Video,
  Calendar,
  Clock,
} from "lucide-react";

interface DBMeeting {
  id: number;
  title: string;
  transcript: string;
  time: string;
}

export default function AskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [meetings, setMeetings] = useState<DBMeeting[]>([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<Set<number>>(
    new Set(),
  );
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMeetings = async () => {
      setIsLoadingMeetings(true);
      try {
        const res = await fetch("/api/meetings");
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.meetings || []);
        }
      } catch (err) {
        console.error("Failed to fetch meetings:", err);
      } finally {
        setIsLoadingMeetings(false);
      }
    };
    fetchMeetings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/meetings/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          meetingsIds: Array.from(selectedMeetingIds),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await res.json();
      setResponse(data.data || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMeetingSelection = (meetingId: number) => {
    const newSelection = new Set(selectedMeetingIds);
    if (newSelection.has(meetingId)) {
      newSelection.delete(meetingId);
    } else {
      newSelection.add(meetingId);
    }
    setSelectedMeetingIds(newSelection);
  };

  const selectAllMeetings = () => {
    if (selectedMeetingIds.size === meetings.length) {
      setSelectedMeetingIds(new Set());
    } else {
      setSelectedMeetingIds(new Set(meetings.map((meeting) => meeting.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/meetings")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Ask Your Meetings</h1>
          </div>
        </div>

        {/* Query Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Ask a Question
            </CardTitle>
            <CardDescription>
              Ask questions about your meetings and get AI-powered answers based
              on your transcripts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Ask anything about your meetings... (e.g., 'What were the main decisions made in the last meeting?')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Ask
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Meetings Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Select Meetings to Search
              </CardTitle>
              {meetings.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMeetings}
                  className="gap-2"
                >
                  {selectedMeetingIds.size === meetings.length ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedMeetingIds.size === meetings.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              )}
            </div>
            <CardDescription>
              {selectedMeetingIds.size > 0
                ? `${selectedMeetingIds.size} meeting${selectedMeetingIds.size !== 1 ? "s" : ""} selected for search`
                : "Select specific meetings to search, or leave empty to search all meetings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMeetings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No meetings found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {meetings.map((meeting) => {
                  let parsedTranscript: unknown[] = [];
                  try {
                    parsedTranscript = JSON.parse(meeting.transcript);
                  } catch {
                    // Keep empty if invalid JSON
                  }

                  return (
                    <div
                      key={meeting.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                        selectedMeetingIds.has(meeting.id)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => toggleMeetingSelection(meeting.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            selectedMeetingIds.has(meeting.id)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground bg-background hover:border-primary"
                          }`}
                        >
                          {selectedMeetingIds.has(meeting.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">
                              {meeting.title || "Untitled Meeting"}
                            </h4>
                            {parsedTranscript &&
                              Array.isArray(parsedTranscript) && (
                                <Badge variant="secondary" className="text-xs">
                                  {parsedTranscript.length} captions
                                </Badge>
                              )}
                          </div>
                          {meeting.time && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(meeting.time).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(meeting.time).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Card */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {response && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{response}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your question is analyzed using AI embeddings</li>
                <li>
                  Relevant meeting chunks are retrieved from your transcripts
                </li>
                <li>AI generates a contextual answer based on your meetings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

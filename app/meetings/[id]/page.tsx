"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Calendar, Clock, MessageSquare, RefreshCw, UserCheck } from "lucide-react";

interface DBMeeting {
  id: number;
  title: string;
  transcript: string;
  time: string;
}

interface TranscriptLine {
  speaker: string;
  text: string;
  time?: string;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const meetingId = resolvedParams.id;

  const [dbMeeting, setDbMeeting] = useState<DBMeeting | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !meetingId) return;
    let isMounted = true;

    const loadMeeting = async () => {
      try {
        const dbRes = await fetch(`/api/meetings/${meetingId}`);
        if (dbRes.ok) {
          const data = await dbRes.json();
          if (isMounted) {
            setDbMeeting(data);
            try {
              setParsedTranscript(JSON.parse(data.transcript));
            } catch {
              setParsedTranscript([]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load meeting detail:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMeeting();

    return () => {
      isMounted = false;
    };
  }, [user, meetingId]);

  const handleAnalyze = async () => {
    if (!dbMeeting) return;
    setIsAnalyzing(true);
    try {
      alert("AI Analysis triggered! In the next step, this prompt sends transcript lines to GPT-4/Gemini to extract notes & tasks.");
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading transcript...
        </div>
      </div>
    );
  }

  if (!user || !dbMeeting) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="text-muted-foreground">Meeting not found.</div>
      <Button variant="outline" onClick={() => router.push("/meetings")}>
        Back to Meetings
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/meetings")}
            className="gap-2 text-muted-foreground hover:text-foreground self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Button>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="default"
              className="gap-2 shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Analyzing Captions..." : "Analyze with AI"}
            </Button>
          </div>
        </div>

        {/* Meeting Header Card */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {dbMeeting.title || "Meeting Captions"}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Database ID: {dbMeeting.id}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                {parsedTranscript.length || 0} Captions
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-muted-foreground border-t">
              {dbMeeting.time && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(dbMeeting.time).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(dbMeeting.time).toLocaleTimeString()}</span>
                  </div>
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Transcript Body Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Live Captions Log
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!parsedTranscript || parsedTranscript.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <p>No transcript lines captured for this session yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {parsedTranscript.map((line, idx) => (
                  <div key={idx} className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className="flex-shrink-0 w-32 font-medium text-xs text-primary flex items-center gap-1.5 pt-0.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span className="truncate">{line.speaker || "Speaker"}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-foreground leading-relaxed">{line.text}</p>
                      {line.time && <span className="text-[11px] text-muted-foreground">{line.time}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

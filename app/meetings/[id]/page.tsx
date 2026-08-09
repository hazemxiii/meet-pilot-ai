"use client";

import { use, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  MessageSquare,
  RefreshCw,
  UserCheck,
  X,
  Check,
  FileText,
  ListTodo,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface AnalysisNote {
  title: string;
  description: string;
}

interface AnalysisTask {
  title: string;
  description: string;
  deadline: string;
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
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptLine[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisNotes, setAnalysisNotes] = useState<AnalysisNote[]>([]);
  const [analysisTasks, setAnalysisTasks] = useState<AnalysisTask[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

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
            if (!data.transcript) {
              setParsedTranscript([]);
              return;
            }

            try {
              const parsed = JSON.parse(data.transcript);
              // Ensure parsed is an array, otherwise treat as plain text
              if (Array.isArray(parsed)) {
                setParsedTranscript(parsed);
              } else if (typeof parsed === "object") {
                // If it's an object but not an array, try to extract text
                setParsedTranscript([
                  { speaker: "Unknown", text: JSON.stringify(parsed) },
                ]);
              } else {
                // If it's a string or other primitive, treat as plain text
                setParsedTranscript([
                  { speaker: "Unknown", text: String(parsed) },
                ]);
              }
            } catch {
              // Handle plain text transcript
              setParsedTranscript([
                { speaker: "Unknown", text: data.transcript },
              ]);
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
      const res = await fetch(`/api/meetings/analyse/${meetingId}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisNotes(data.notes || []);
        setAnalysisTasks(data.tasks || []);
        setSelectedNotes(
          new Set(data.notes?.map((_: any, i: number) => i) || []),
        );
        setSelectedTasks(
          new Set(data.tasks?.map((_: any, i: number) => i) || []),
        );
        setShowAnalysisDialog(true);
      } else {
        console.error("Analysis failed:", await res.text());
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    setIsSaving(true);
    try {
      const notesToSave = analysisNotes.filter((_, i) => selectedNotes.has(i));
      const tasksToSave = analysisTasks.filter((_, i) => selectedTasks.has(i));

      if (notesToSave.length > 0) {
        await fetch("/api/notes/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: notesToSave.map((note) => ({
              title: note.title,
              details: note.description,
            })),
          }),
        });
      }

      if (tasksToSave.length > 0) {
        await fetch("/api/tasks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: tasksToSave.map((task) => ({
              title: task.title,
              details: task.description,
              deadline: task.deadline,
            })),
          }),
        });
      }

      setShowAnalysisDialog(false);
      setAnalysisNotes([]);
      setAnalysisTasks([]);
      setSelectedNotes(new Set());
      setSelectedTasks(new Set());
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNoteSelection = (index: number) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleTaskSelection = (index: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

  if (!user || !dbMeeting)
    return (
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
            {!parsedTranscript ||
            !Array.isArray(parsedTranscript) ||
            parsedTranscript.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <p>No transcript lines captured for this session yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {parsedTranscript.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex-shrink-0 w-32 font-medium text-xs text-primary flex items-center gap-1.5 pt-0.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {line.speaker || "Speaker"}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-foreground leading-relaxed">
                        {line.text}
                      </p>
                      {line.time && (
                        <span className="text-[11px] text-muted-foreground">
                          {line.time}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis Results
            </DialogTitle>
            <DialogDescription>
              Review and select the notes and tasks you want to save
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Notes Section */}
            {analysisNotes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">
                    Notes ({analysisNotes.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {analysisNotes.map((note, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedNotes.has(index)}
                        onCheckedChange={() => toggleNoteSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{note.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {note.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {analysisTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">
                    Tasks ({analysisTasks.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {analysisTasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedTasks.has(index)}
                        onCheckedChange={() => toggleTaskSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        {task.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Deadline:{" "}
                            {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisNotes.length === 0 && analysisTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No notes or tasks were generated from this meeting.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowAnalysisDialog(false)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveAnalysis}
              disabled={
                isSaving ||
                (selectedNotes.size === 0 && selectedTasks.size === 0)
              }
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Selected ({selectedNotes.size + selectedTasks.size})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

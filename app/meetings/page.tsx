"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Video,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Check,
  X,
} from "lucide-react";

interface DBMeeting {
  id: number;
  title: string;
  transcript: string;
  time: string;
}

interface TranscriptUploadResult {
  id: string | number;
  fileName: string;
  mimeType: string;
  path: string;
  meetingId: number | null;
}

export default function MeetingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimersRef = useRef<number[]>([]);

  const [dbMeetings, setDbMeetings] = useState<DBMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTranscribingVideo, setIsTranscribingVideo] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] =
    useState<TranscriptUploadResult | null>(null);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<Set<number>>(
    new Set(),
  );
  const [meetingToDelete, setMeetingToDelete] = useState<DBMeeting | null>(
    null,
  );
  const [meetingsToDelete, setMeetingsToDelete] = useState<DBMeeting[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const clearStageTimers = () => {
    stageTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    stageTimersRef.current = [];
  };

  const beginUploadStages = () => {
    clearStageTimers();
    setIsTranscribingVideo(true);
    setUploadError("");
    setUploadResult(null);
    setUploadStage("Uploading...");

    stageTimersRef.current.push(
      window.setTimeout(() => setUploadStage("Transcribing..."), 1200),
    );
    stageTimersRef.current.push(
      window.setTimeout(() => setUploadStage("Saving transcript..."), 3500),
    );
  };

  const finishUploadStages = () => {
    clearStageTimers();
    setIsTranscribingVideo(false);
    setUploadStage("");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleVideoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    const allowedExtensions = [".mp4", ".webm", ".mov", ".mkv"];
    const hasAllowedExtension = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!hasAllowedExtension) {
      setUploadError("Invalid video format. Use MP4, WebM, MOV, or MKV.");
      return;
    }

    beginUploadStages();

    try {
      const formData = new FormData();
      formData.append("video", selectedFile);

      const response = await fetch("/api/meetings/transcribe-video", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to transcribe video");
      }

      setUploadResult(data.transcript);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to transcribe video",
      );
    } finally {
      finishUploadStages();
    }
  };

  const loadDBMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/meetings");
      if (response.ok) {
        const data = await response.json();
        setDbMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error("Failed to fetch DB meetings", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const initLoad = async () => {
      try {
        if (isMounted) setIsLoading(true);
        const response = await fetch("/api/meetings");
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setDbMeetings(data.meetings || []);
        }
      } catch (err) {
        console.error("Failed to fetch DB meetings", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initLoad();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const filteredMeetings = dbMeetings.filter((m) =>
    (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDeleteMeeting = async (id: number) => {
    setIsDeleting(true);

    // Optimistic update: remove the meeting immediately
    const previousMeetings = dbMeetings;
    setDbMeetings(dbMeetings.filter((meeting) => meeting.id !== id));

    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Roll back on failure
        setDbMeetings(previousMeetings);
        console.error("Error deleting meeting:", await response.text());
      }
    } catch (error) {
      // Roll back on network error
      setDbMeetings(previousMeetings);
      console.error("Error deleting meeting:", error);
    } finally {
      setIsDeleting(false);
      setMeetingToDelete(null);
    }
  };

  const handleBulkDeleteMeetings = async () => {
    setIsDeleting(true);

    // Optimistic update: remove the meetings immediately
    const previousMeetings = dbMeetings;
    const idsToDelete = Array.from(selectedMeetingIds);
    setDbMeetings(
      dbMeetings.filter((meeting) => !selectedMeetingIds.has(meeting.id)),
    );

    try {
      const response = await fetch(
        `/api/meetings/bulk?ids=${idsToDelete.join(",")}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        // Roll back on failure
        setDbMeetings(previousMeetings);
        console.error("Error deleting meetings:", await response.text());
      } else {
        // Clear selection on success
        setSelectedMeetingIds(new Set());
      }
    } catch (error) {
      // Roll back on network error
      setDbMeetings(previousMeetings);
      console.error("Error deleting meetings:", error);
    } finally {
      setIsDeleting(false);
      setMeetingsToDelete([]);
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
    if (selectedMeetingIds.size === filteredMeetings.length) {
      setSelectedMeetingIds(new Set());
    } else {
      setSelectedMeetingIds(
        new Set(filteredMeetings.map((meeting) => meeting.id)),
      );
    }
  };

  if (loading || (isLoading && dbMeetings.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading meetings...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Video className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Captions & Transcripts
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Recorded <span className="text-primary">Meetings</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Live meeting captions synced directly from your Meet-Pilot Chrome
              Extension.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.mov,.mkv,video/mp4,video/webm,video/quicktime,video/x-matroska"
              className="hidden"
              onChange={handleVideoSelected}
            />
            <Button
              onClick={() => router.push("/meetings/create")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              New Meeting
            </Button>
            {/* <Button
              onClick={handleUploadClick}
              disabled={isTranscribingVideo}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isTranscribingVideo
                ? uploadStage || "Uploading..."
                : "Upload Video"}
            </Button> */}
            <Button
              onClick={loadDBMeetings}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="border-muted/50 bg-muted/10 shadow-none">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full bg-background"
                placeholder="Search meetings by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedMeetingIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedMeetingIds.size} meeting
                  {selectedMeetingIds.size !== 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setMeetingsToDelete(
                      filteredMeetings.filter((meeting) =>
                        selectedMeetingIds.has(meeting.id),
                      ),
                    );
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMeetingIds(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {(isTranscribingVideo || uploadResult || uploadError) && (
          <div className="space-y-3">
            {isTranscribingVideo && (
              <Card className="border-primary/30 bg-primary/5 shadow-none">
                <CardContent className="p-4 flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Processing video</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadStage || "Uploading..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {uploadResult && (
              <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-none">
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold">Transcript saved</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{uploadResult.fileName}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{uploadResult.mimeType}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground break-all">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{uploadResult.path}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {uploadResult.meetingId
                        ? `Linked to meeting ${uploadResult.meetingId}`
                        : "Saved without a meeting link"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {uploadError && (
              <Card className="border-red-500/30 bg-red-500/5 shadow-none">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Upload failed</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadError}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Meetings List */}
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <Card className="border-dashed py-16 text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-lg font-semibold">
                    No meeting recordings found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start a Google Meet session with the Meet-Pilot extension
                    active to capture live captions. They will automatically
                    sync here.
                  </p>
                </div>
                <Button
                  onClick={loadDBMeetings}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredMeetings.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllMeetings}
                    className="gap-2"
                  >
                    {selectedMeetingIds.size === filteredMeetings.length ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {selectedMeetingIds.size === filteredMeetings.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
              )}
              {filteredMeetings.map((meeting) => {
                let parsedTranscript: unknown[] = [];
                try {
                  parsedTranscript = JSON.parse(meeting.transcript);
                } catch {
                  // Keep empty if invalid JSON
                }

                return (
                  <Card
                    key={meeting.id}
                    className={`group hover:border-primary/50 transition-all cursor-pointer relative ${
                      selectedMeetingIds.has(meeting.id)
                        ? "border-primary ring-2 ring-primary/20"
                        : ""
                    }`}
                    onClick={() => router.push(`/meetings/${meeting.id}`)}
                  >
                    <div
                      className="absolute top-6 left-6 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedMeetingIds.has(meeting.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground bg-background hover:border-primary"
                        }`}
                        onClick={() => toggleMeetingSelection(meeting.id)}
                      >
                        {selectedMeetingIds.has(meeting.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6 pl-14 flex items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                            {meeting.title || "Untitled Meeting"}
                          </h3>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Auto Synced
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {meeting.time && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(meeting.time).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
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
                            </>
                          )}
                          {parsedTranscript &&
                            Array.isArray(parsedTranscript) && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {parsedTranscript.length} captions
                              </span>
                            )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="group-hover:translate-x-1 transition-transform"
                      >
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!meetingToDelete}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setMeetingToDelete(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete meeting</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>
                Are you sure you want to delete this meeting?
              </AlertTitle>
              <AlertDescription>
                &ldquo;{meetingToDelete?.title || "Untitled Meeting"}&rdquo;
                will be permanently removed from your recordings.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMeetingToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  meetingToDelete && handleDeleteMeeting(meetingToDelete.id)
                }
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog
          open={meetingsToDelete.length > 0}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setMeetingsToDelete([]);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Delete {meetingsToDelete.length} meeting
                {meetingsToDelete.length !== 1 ? "s" : ""}
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>
                Are you sure you want to delete {meetingsToDelete.length}{" "}
                meeting{meetingsToDelete.length !== 1 ? "s" : ""}?
              </AlertTitle>
              <AlertDescription>
                {meetingsToDelete.length > 1
                  ? `${meetingsToDelete.length} meetings will be permanently removed from your recordings.`
                  : `\"${meetingsToDelete[0]?.title || "Untitled Meeting"}\" will be permanently removed from your recordings.`}
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMeetingsToDelete([])}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDeleteMeetings}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

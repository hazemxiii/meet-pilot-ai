"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Video, Search, RefreshCw, Calendar, Clock, Sparkles, ChevronRight } from "lucide-react";

interface DBMeeting {
  id: number;
  title: string;
  transcript: string;
  time: string;
}

export default function MeetingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dbMeetings, setDbMeetings] = useState<DBMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
    return () => { isMounted = false; };
  }, [user]);

  const filteredMeetings = dbMeetings.filter((m) =>
    (m.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Live meeting captions synced directly from your Meet-Pilot Chrome Extension.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={loadDBMeetings} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
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
          </CardContent>
        </Card>

        {/* Meetings List */}
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <Card className="border-dashed py-16 text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-lg font-semibold">No meeting recordings found</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a Google Meet session with the Meet-Pilot extension active to capture live captions. They will automatically sync here.
                  </p>
                </div>
                <Button onClick={loadDBMeetings} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh List
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMeetings.map((meeting) => {
              let parsedTranscript: unknown[] = [];
              try {
                parsedTranscript = JSON.parse(meeting.transcript);
              } catch {
                // Keep empty if invalid JSON
              }

              return (
                <Card
                  key={meeting.id}
                  className="group hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                >
                  <CardContent className="p-6 flex items-center justify-between gap-4">
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
                              <span>{new Date(meeting.time).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(meeting.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </>
                        )}
                        {parsedTranscript && Array.isArray(parsedTranscript) && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {parsedTranscript.length} captions
                          </span>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

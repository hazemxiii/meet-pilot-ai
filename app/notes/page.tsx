"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Plus, MoreVertical, FilePlus2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Note {
  id: string;
  title: string;
  details: string;
  created_at: string;
  updated_at: string;
  tags?: { id: string; name: string }[];
}

interface NoteListResponse {
  notes: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function NotesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNotes = async (query = searchQuery) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);

      const response = await fetch(`/api/notes?${params.toString()}`);
      if (response.ok) {
        const data: NoteListResponse = await response.json();
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
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

    const loadNotes = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);

        const response = await fetch(`/api/notes?${params.toString()}`);
        if (response.ok && isMounted) {
          const data: NoteListResponse = await response.json();
          setNotes(data.notes);
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, [user, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== id));
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Knowledge Base
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Notes & <span className="text-primary">Intelligence</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Your centralized repository of AI-distilled insights, project documentation, and meeting transcripts.
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => router.push("/notes/new")}
          >
            <Plus className="h-5 w-5" />
            Create Note
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <Card className="border-muted/50 bg-muted/10 shadow-none">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full bg-background"
                placeholder="Search by title, snippets, or #tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="default" className="flex-1 sm:flex-none">All Notes</Button>
              <Button variant="outline" className="flex-1 sm:flex-none">Recent</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        <div className="pb-8">
          {notes.length === 0 ? (
            <Card className="border-dashed py-16">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                  <FilePlus2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-semibold">No notes found</h3>
                  <p className="text-muted-foreground">
                    We couldn&apos;t find any notes matching your search criteria. Try a different keyword or create a new one.
                  </p>
                </div>
                <Button onClick={() => router.push("/notes/new")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className="group flex flex-col h-full hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/notes/${note.id}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                        >
                          Delete note
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 pb-4">
                    <CardTitle className="mb-2 text-xl group-hover:text-primary transition-colors line-clamp-2">
                      {note.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm line-clamp-4 mb-4 flex-1">
                      {note.details}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t">
                      <div className="flex flex-wrap gap-1">
                        {note.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">
                            #{tag.name}
                          </Badge>
                        ))}
                        {(note.tags?.length || 0) > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.tags!.length - 3}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

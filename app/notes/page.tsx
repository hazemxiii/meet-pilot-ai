"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16 w-full max-w-container-max mx-auto px-margin-desktop bg-background min-h-screen">
        <div className="flex flex-col w-full">
          {/* Header Section */}
          <div className="relative px-0 py-unit-xl overflow-hidden mb-unit-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low via-background to-surface-container-high opacity-50"></div>
            <div className="absolute -right-24 -top-24 w-96 h-96 bg-secondary/5 rounded-full blur-[120px]"></div>
            <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]"></div>
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-unit-lg">
              <div className="max-w-2xl">
                <div className="flex items-center gap-unit-sm mb-unit-sm">
                  <span className="w-8 h-[2px] bg-secondary"></span>
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-[0.2em]">
                    Knowledge Base
                  </span>
                </div>
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                  Notes & <span className="text-secondary">Intelligence</span>
                </h1>
                <p className="mt-unit-sm font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                  Your centralized repository of AI-distilled insights, project documentation, and meeting transcripts.
                </p>
              </div>
              <button
                onClick={() => router.push("/notes/new")}
                className="flex items-center gap-unit-sm bg-primary text-on-primary px-unit-lg py-3 rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span className="font-label-md text-label-md">Create Note</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="mb-unit-xl">
            <div className="bg-surface-container-lowest shadow-sm rounded-2xl p-unit-md flex flex-col lg:flex-row gap-unit-md items-center border border-outline-variant/30">
              <div className="relative w-full lg:flex-1">
                <span className="material-symbols-outlined absolute left-unit-md top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-12 pr-unit-md text-body-md focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                  placeholder="Search by title, snippets, or #tags..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                />
              </div>
              <div className="flex items-center gap-unit-sm overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                <button className="whitespace-nowrap px-unit-lg py-2 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md">
                  All Notes
                </button>
                <button className="whitespace-nowrap px-unit-lg py-2 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest transition-colors">
                  Recent
                </button>
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          <div className="pb-margin-desktop">
            {notes.length === 0 ? (
              <div className="hidden flex-col items-center justify-center py-unit-xl text-center">
                <div className="w-64 h-64 mb-unit-lg">
                  <div className="w-full h-full bg-primary/5 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[80px] text-outline-variant">
                      description
                    </span>
                  </div>
                </div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-unit-sm">
                  No notes found
                </h3>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
                  We couldn't find any notes matching your search criteria. Try a different keyword or create a new one.
                </p>
                <button
                  onClick={() => router.push("/notes/new")}
                  className="mt-unit-lg flex items-center gap-unit-sm bg-secondary text-on-secondary px-unit-xl py-3 rounded-xl"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span className="font-label-md text-label-md">Create New Note</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-unit-lg">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="note-card group bg-surface-container-lowest rounded-[24px] p-unit-lg shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent hover:border-secondary/20 cursor-pointer"
                    onClick={() => router.push(`/notes/${note.id}`)}
                  >
                    <div className="flex justify-between items-start mb-unit-md">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="text-on-surface-variant/40 hover:text-error"
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-unit-sm group-hover:text-secondary transition-colors">
                      {note.title}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-4 mb-unit-lg">
                      {note.details}
                    </p>
                    <div className="mt-auto pt-unit-md border-t border-outline-variant/10 flex items-center justify-between">
                      <div className="flex flex-wrap gap-unit-xs">
                        {note.tags?.map((tag) => (
                          <span
                            key={tag.id}
                            className="bg-surface-container-high px-2 py-1 rounded-md text-on-surface-variant font-label-sm text-label-sm"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-on-surface-variant/40 font-label-sm text-label-sm">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

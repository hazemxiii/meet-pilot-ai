"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Save,
  X,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Sparkles,
  UploadCloud,
  Settings,
  Plus
} from "lucide-react";

interface NoteFormValues {
  title: string;
  details: string;
  tags: string[];
}

const emptyNoteFormValues: NoteFormValues = {
  title: "",
  details: "",
  tags: [],
};

export default function NewNotePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<NoteFormValues>(emptyNoteFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/notes");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create note");
      }
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
        {/* Status Bar & Top Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-primary mb-1">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                  Document Editor
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Creating new note...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/notes")}
            >
              Discard Changes
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Editor Core */}
          <div className="md:col-span-8 space-y-6">
            {/* Title Input Section */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <input
                  className="w-full bg-transparent border-none outline-none text-3xl font-bold text-primary placeholder:text-muted-foreground/50"
                  placeholder="Enter note title..."
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                
                {/* Tag Chip Selector */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 text-sm">
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:text-destructive hover:bg-transparent"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32 h-8 text-sm"
                      placeholder="Add tag..."
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleAddTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rich Text Editor Surface */}
            <Card className="min-h-[600px] flex flex-col relative">
              {/* Editor Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <List className="h-4 w-4" />
                </Button>
                <div className="w-[1px] h-6 bg-border mx-2" />
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Code className="h-4 w-4" />
                </Button>
                
                <div className="ml-auto">
                  <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3" />
                    AI Active
                  </Badge>
                </div>
              </div>

              {/* Markdown / Rich Text Body */}
              <textarea
                className="p-6 flex-1 focus-within:outline-none overflow-y-auto text-base text-foreground leading-relaxed bg-transparent resize-none min-h-[500px]"
                placeholder="Start writing your note..."
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
              />

              {/* AI Floating Action */}
              <div className="absolute bottom-6 right-6">
                <Button className="gap-2 rounded-full shadow-lg" size="lg">
                  Ask AI to Refine
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center -mr-1">
                    <Sparkles className="h-3 w-3" />
                  </div>
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Metadata & Files */}
          <div className="md:col-span-4 space-y-6">
            {/* Associated Files Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Attachments</CardTitle>
                <Badge variant="secondary">0 Files</Badge>
              </CardHeader>
              <CardContent>
                {/* Drop Zone */}
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group">
                  <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    Click or drag to upload additional assets
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Context Card */}
            <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl" />
              <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative z-10 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70 mb-3">
                    Collaborators
                  </h4>
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-foreground text-primary flex items-center justify-center font-bold text-sm shadow-sm">
                      {user.email?.[0].toUpperCase() || "U"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-semibold text-primary-foreground/70 uppercase mb-1">
                      Visibility
                    </p>
                    <p className="font-medium text-sm">Internal Team Only</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

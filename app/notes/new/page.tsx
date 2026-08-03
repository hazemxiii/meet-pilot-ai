"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="relative pt-16 min-h-screen">
        <div className="flex flex-col w-full">
          {/* Status Bar & Top Actions */}
          <div className="flex items-center justify-between px-margin-desktop py-unit-lg">
            <div className="flex items-center gap-unit-md">
              <div className="flex flex-col">
                <div className="flex items-center gap-unit-sm text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[18px]">
                    description
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest">
                    Document Editor
                  </span>
                </div>
                <div className="flex items-center gap-unit-md text-on-surface-variant/60 font-label-sm text-label-sm">
                  <span>Creating new note...</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-unit-md">
              <button
                onClick={() => router.push("/notes")}
                className="px-unit-lg py-2 rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-unit-xl py-2 rounded-xl font-label-md text-label-md bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isSubmitting ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-gutter px-margin-desktop pb-margin-desktop">
            {/* Left Column: Editor Core */}
            <div className="col-span-8 flex flex-col gap-gutter">
              {/* Title Input Section */}
              <div className="bg-surface-container-lowest p-unit-xl rounded-3xl shadow-sm">
                <input
                  className="w-full bg-transparent border-none outline-none font-headline-xl text-headline-xl text-primary placeholder:text-outline-variant/50 selection:bg-secondary-container"
                  placeholder="Enter note title..."
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                {/* Tag Chip Selector */}
                <div className="mt-unit-lg flex flex-wrap items-center gap-unit-sm">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-unit-sm px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg font-label-md text-label-md"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="material-symbols-outlined text-[16px] hover:text-error transition-colors"
                      >
                        close
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-unit-sm">
                    <input
                      className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-secondary/20 w-32"
                      placeholder="Add tag..."
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <button
                      onClick={handleAddTag}
                      className="flex items-center gap-unit-sm px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-lg font-label-md text-label-md hover:bg-outline-variant/30 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rich Text Editor Surface */}
              <div className="bg-surface-container-lowest min-h-[600px] rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-unit-sm p-unit-md border-b border-surface-container">
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined">format_bold</span>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined">format_italic</span>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                  </button>
                  <div className="w-[1px] h-6 bg-outline-variant/30 mx-2"></div>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined">link</span>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <span className="material-symbols-outlined">code</span>
                  </button>
                  <div className="ml-auto px-unit-md py-1 bg-secondary/10 text-secondary rounded-full font-label-sm text-label-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      auto_awesome
                    </span>
                    AI Assistant Active
                  </div>
                </div>

                {/* Markdown / Rich Text Body */}
                <textarea
                  className="p-unit-xl flex-1 focus-within:outline-none overflow-y-auto font-body-lg text-body-lg text-on-surface leading-relaxed bg-transparent resize-none min-h-[500px]"
                  placeholder="Start writing your note..."
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                />

                {/* AI Floating Action */}
                <div className="absolute bottom-unit-lg right-unit-lg">
                  <button className="group flex items-center gap-unit-md bg-primary text-on-primary pl-unit-lg pr-unit-sm py-unit-sm rounded-full shadow-2xl hover:shadow-primary/40 transition-all active:scale-95">
                    <span className="font-label-md text-label-md">
                      Ask AI to Refine
                    </span>
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined">auto_awesome</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata & Files */}
            <div className="col-span-4 flex flex-col gap-gutter">
              {/* Associated Files Section */}
              <div className="bg-surface-container p-unit-lg rounded-3xl">
                <div className="flex items-center justify-between mb-unit-lg">
                  <h3 className="font-headline-md text-headline-md text-primary">
                    Attachments
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                    0 Files
                  </span>
                </div>

                {/* Drop Zone */}
                <div className="border-2 border-dashed border-outline-variant/50 rounded-2xl p-unit-xl flex flex-col items-center justify-center gap-unit-sm group cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all">
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary text-[32px]">
                    upload_file
                  </span>
                  <p className="font-label-md text-label-md text-on-surface-variant group-hover:text-secondary text-center">
                    Click or drag to upload additional assets
                  </p>
                </div>
              </div>

              {/* Quick Context Card */}
              <div className="bg-primary text-on-primary p-unit-xl rounded-3xl overflow-hidden relative">
                {/* Abstract Background Detail */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-on-primary/60 mb-unit-md">
                    Collaborators
                  </h4>
                  <div className="flex -space-x-3 mb-unit-xl">
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-semibold text-xs">
                      {user.email?.[0].toUpperCase() || "U"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-label-sm text-label-sm text-on-primary/60 uppercase">
                        Visibility
                      </p>
                      <p className="font-label-md text-label-md">Internal Team Only</p>
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-on-primary/10 hover:bg-on-primary/20 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined">settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FloatingSelectionButton from "@/components/FloatingSelectionButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, BrainCircuit, Sparkles, Trash2, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoryItem {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function MemoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const response = await fetch("/api/memory");
        if (response.ok) {
          const data = await response.json();
          setMemoryItems(data);
        }
      } catch (error) {
        console.error("Error fetching memory items:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const addMemoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setMemoryItems([newItem, ...memoryItems]);
        setNewContent("");
      }
    } catch (error) {
      console.error("Error adding memory item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMemoryItem = async (id: string) => {
    try {
      const response = await fetch(`/api/memory?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMemoryItems(memoryItems.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Error deleting memory item:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} memory items?`,
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/memory?ids=${selectedItems.join(",")}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setMemoryItems(
          memoryItems.filter((item) => !selectedItems.includes(item.id)),
        );
        setSelectedItems([]);
      }
    } catch (error) {
      console.error("Error bulk deleting memory items:", error);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(
      selectedItems.includes(id)
        ? selectedItems.filter((itemId) => itemId !== id)
        : [...selectedItems, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === memoryItems.length
        ? []
        : memoryItems.map((item) => item.id),
    );
  };

  if (loading || isLoading) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <BrainCircuit className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Memory Manager
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AI Memory Context</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="md:col-span-4 lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                  Memory Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[68%] transition-all" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {memoryItems.length} memory items stored. Pilot AI is learning your style.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground border-none">
              <CardContent className="p-4 flex items-center gap-3">
                <BrainCircuit className="h-5 w-5" />
                <span className="font-semibold">Memory Items</span>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="md:col-span-8 lg:col-span-9 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-2xl">Memory Items</CardTitle>
                  <CardDescription>
                    Individual instructions and context stored in your AI memory.
                  </CardDescription>
                </div>
                <Sparkles className="h-8 w-8 text-primary/20" />
              </CardHeader>
              <CardContent className="space-y-4">
                {memoryItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No memory items yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first memory item below
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {memoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col gap-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
                          selectedItems.includes(item.id) ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => handleSelectItem(item.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMemoryItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{item.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-6 border-t mt-6">
                  <form onSubmit={addMemoryItem} className="space-y-4">
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Enter information you want the AI to remember..."
                      className="resize-none"
                      rows={3}
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !newContent.trim()}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {isSubmitting ? "Adding..." : "Add Memory Item"}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        <FloatingSelectionButton
          selectedCount={selectedItems.length}
          totalCount={memoryItems.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={() => setSelectedItems([])}
          confirmButton={
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          }
          onConfirm={handleBulkDelete}
        />
      </div>
    </div>
  );
}

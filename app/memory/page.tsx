"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
      <main className="w-full max-w-[1280px] mx-auto px-[8px] bg-background min-h-screen">
        <div className="flex flex-col w-full transition-all duration-700 opacity-100 translate-y-0">
          {/* Dynamic Background Element */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
            <div className="absolute top-[40%] -left-[10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]"></div>
          </div>

          <div className="relative z-10 flex flex-col gap-[48px] pb-[48px]">
            {/* Top Section: Profile Hero */}
            <section className="grid grid-cols-12 gap-[24px] items-end mt-[48px] transition-all duration-700 opacity-100 translate-y-0">
              <div className="col-span-12 lg:col-span-8 flex flex-col md:flex-row items-center md:items-end gap-[24px]">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/10 rounded-full scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="relative w-48 h-48 rounded-full bg-primary flex items-center justify-center text-on-primary text-[64px] font-bold shadow-xl border-4 border-surface">
                    {user.email?.[0].toUpperCase() || "U"}
                  </div>
                </div>
                <div className="flex flex-col text-center md:text-left pb-2">
                  <span className="font-label-md text-label-md text-secondary tracking-widest uppercase mb-1">
                    Account Executive
                  </span>
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                    {user.user_metadata?.full_name || user.email}
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 flex justify-center lg:justify-end gap-[24px] pb-2">
                <button
                  onClick={() => router.push("/")}
                  className="px-[24px] py-3 bg-surface-container-high text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container-highest transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    arrow_back
                  </span>
                  Back to Home
                </button>
              </div>
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-[24px]">
              {/* Left Column: Navigation/Summary */}
              <aside className="col-span-12 lg:col-span-3 flex flex-col gap-[24px]">
                <div className="p-[24px] bg-surface-container-low rounded-2xl flex flex-col gap-[16px]">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Memory Health
                  </h3>
                  <div className="relative h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-secondary w-[68%] transition-all duration-1000 ease-out rounded-full"></div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {memoryItems.length} memory items stored. Pilot AI is
                    learning your style.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm font-label-sm rounded-full">
                      {memoryItems.length} Items
                    </span>
                  </div>
                </div>
                <nav className="flex flex-col gap-1">
                  <a
                    className="flex items-center justify-between p-[24px] bg-primary text-on-primary rounded-xl transition-all shadow-md group"
                    href="#memory"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined">
                        psychology
                      </span>
                      <span className="font-label-md text-label-md">
                        Memory Items
                      </span>
                    </div>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                  </a>
                </nav>
              </aside>

              {/* Right Column: AI Memory Dashboard */}
              <main className="col-span-12 lg:col-span-9 flex flex-col gap-[48px]">
                {/* Section: Memory Items */}
                <div
                  className="p-[48px] bg-surface-container-lowest rounded-[32px] shadow-sm flex flex-col gap-[24px] transition-all duration-700 opacity-100 translate-y-0"
                  id="memory"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">
                        Memory Items
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Individual instructions and context stored in your AI
                        memory.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-secondary text-[40px] opacity-20">
                      auto_awesome
                    </span>
                  </div>

                  <div className="flex flex-col gap-[16px]">
                    {memoryItems.length === 0 ? (
                      <div className="bg-surface-container-low rounded-2xl p-8 text-center">
                        <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-20">
                          description
                        </span>
                        <p className="text-on-surface-variant mt-4">
                          No memory items yet
                        </p>
                        <p className="text-on-surface-variant text-sm mt-1">
                          Add your first memory item below
                        </p>
                      </div>
                    ) : (
                      memoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col gap-[8px] p-[24px] bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                              Updated{" "}
                              {new Date(item.updated_at).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteMemoryItem(item.id)}
                                className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors"
                              >
                                delete
                              </button>
                            </div>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface">
                            {item.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Memory Item Form */}
                  <div className="flex flex-col gap-[16px] p-[24px] bg-surface-container-low rounded-2xl">
                    <form onSubmit={addMemoryItem}>
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Enter information you want to remember..."
                        className="w-full p-4 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent resize-none text-on-surface placeholder:text-on-surface-variant"
                        rows={3}
                        disabled={isSubmitting}
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmitting || !newContent.trim()}
                          className="bg-primary text-on-primary py-2 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:bg-surface-container-high disabled:cursor-not-allowed font-label-md text-label-md flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            add
                          </span>
                          {isSubmitting ? "Adding..." : "Add Memory Item"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

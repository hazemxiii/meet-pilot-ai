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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Memory Items
              </h1>
              <p className="text-gray-600">
                Store and manage information about yourself
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Add New Memory Item Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add New Memory Item
          </h2>
          <form onSubmit={addMemoryItem}>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter information you want to remember..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Adding..." : "Add Memory"}
              </button>
            </div>
          </form>
        </div>

        {/* Memory Items List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Memory Items ({memoryItems.length})
          </h2>
          {memoryItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">No memory items yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Add your first memory item above
              </p>
            </div>
          ) : (
            memoryItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {item.content}
                    </p>
                    <p className="text-gray-400 text-sm mt-3">
                      Last updated: {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemoryItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    title="Delete memory item"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

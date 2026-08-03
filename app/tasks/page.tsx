"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProfileHeader from "@/components/ProfileHeader";
import FloatingSelectionButton from "@/components/FloatingSelectionButton";

interface Task {
  id: string;
  title: string;
  details: string;
  done: boolean;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskListResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [doneFilter, setDoneFilter] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, pagination.page, doneFilter]);

  const fetchTasks = async (pageOverride?: number) => {
    try {
      const params = new URLSearchParams({
        page: (pageOverride ?? pagination.page).toString(),
        limit: pagination.limit.toString(),
      });

      if (doneFilter) params.append("done", doneFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data: TaskListResponse = await response.json();
        setTasks(data.tasks);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pagination.page !== 1) {
      setPagination({ ...pagination, page: 1 });
    } else {
      fetchTasks(1);
    }
  };

  const handleToggleDone = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks(tasks.filter((task) => task.id !== id));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)
    )
      return;

    try {
      const response = await fetch(
        `/api/tasks/bulk?ids=${selectedTasks.join(",")}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setTasks(tasks.filter((task) => !selectedTasks.includes(task.id)));
        setSelectedTasks([]);
      }
    } catch (error) {
      console.error("Error bulk deleting tasks:", error);
    }
  };

  const handleSelectTask = (id: string) => {
    setSelectedTasks(
      selectedTasks.includes(id)
        ? selectedTasks.filter((taskId) => taskId !== id)
        : [...selectedTasks, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedTasks(
      selectedTasks.length === tasks.length ? [] : tasks.map((task) => task.id),
    );
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
          {/* Header & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter mb-unit-xl">
            <div className="space-y-unit-xs">
              <div className="flex items-center gap-2 text-primary">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="font-label-md text-label-md tracking-widest uppercase opacity-70">
                  Task Manager
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-background tracking-tight">
                Action Items
              </h1>
            </div>
            <div className="flex items-center gap-unit-md">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  className="pl-10 pr-unit-lg py-2.5 bg-surface-container-low rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all w-64"
                  placeholder="Search tasks..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                />
              </div>
              <button
                onClick={() => router.push("/tasks/new")}
                className="bg-primary text-on-primary px-unit-lg py-2.5 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add
                </span>
                Create Task
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-unit-xl">
            <div className="bg-surface-container-lowest p-unit-lg rounded-2xl shadow-sm flex flex-col gap-1 group hover:shadow-md transition-shadow cursor-default">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                Total Tasks
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-lg font-headline-lg text-primary">
                  {tasks.length}
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-unit-lg rounded-2xl shadow-sm flex flex-col gap-1 group hover:shadow-md transition-shadow cursor-default">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                Pending
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-lg font-headline-lg text-secondary">
                  {tasks.filter((t) => !t.done).length}
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-unit-lg rounded-2xl shadow-sm flex flex-col gap-1 group hover:shadow-md transition-shadow cursor-default">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                Completed
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-lg font-headline-lg text-on-surface">
                  {tasks.filter((t) => t.done).length}
                </span>
                <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-1000"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.done).length / tasks.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-unit-md mb-unit-lg">
            <select
              value={doneFilter}
              onChange={(e) => setDoneFilter(e.target.value)}
              className="px-unit-lg py-2.5 bg-surface-container-low rounded-xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
            >
              <option value="">All Tasks</option>
              <option value="false">Pending</option>
              <option value="true">Completed</option>
            </select>
          </div>

          {/* Task List Container */}
          <div className="flex flex-col gap-unit-md relative">
            {tasks.length === 0 ? (
              <div className="py-unit-xl flex flex-col items-center justify-center text-center space-y-unit-lg">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
                  <div className="absolute inset-8 border-2 border-dashed border-outline-variant rounded-full"></div>
                  <span className="material-symbols-outlined text-[80px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-outline-variant">
                    assignment_late
                  </span>
                </div>
                <div className="max-w-xs">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                    No tasks found
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Create your first task to get started
                  </p>
                </div>
                <button
                  onClick={() => router.push("/tasks/new")}
                  className="bg-secondary text-on-secondary px-unit-xl py-3 rounded-xl font-label-md text-label-md hover:shadow-xl transition-all"
                >
                  Create Task
                </button>
              </div>
            ) : (
              <>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="group relative bg-surface-container-lowest hover:bg-surface transition-all duration-300 rounded-2xl p-unit-lg shadow-sm hover:shadow-xl hover:-translate-y-1 flex items-start gap-unit-lg overflow-hidden"
                  >
                    <div className="mt-1">
                      <button
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                          task.done
                            ? "border-secondary bg-secondary/10 text-secondary"
                            : "border-outline-variant text-transparent hover:border-secondary"
                        }`}
                        onClick={() => handleToggleDone(task)}
                      >
                        <span className="material-symbols-outlined text-[18px] font-bold">
                          check
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-unit-md">
                      <div className="space-y-1">
                        <h3
                          className={`font-headline-md text-headline-md group-hover:text-primary transition-colors cursor-pointer ${
                            task.done
                              ? "line-through text-on-surface-variant"
                              : "text-on-surface"
                          }`}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                        >
                          {task.title}
                        </h3>
                        {task.details && (
                          <p className="text-body-sm text-on-surface-variant">
                            {task.details}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-unit-md text-on-surface-variant">
                          {task.deadline && (
                            <div className="flex items-center gap-1.5 bg-surface-container rounded-lg px-2.5 py-1">
                              <span className="material-symbols-outlined text-[16px]">
                                calendar_today
                              </span>
                              <span className="text-label-sm font-label-sm">
                                {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`material-symbols-outlined text-[16px] ${
                                task.done
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              {task.done ? "check_circle" : "schedule"}
                            </span>
                            <span
                              className={`text-label-sm font-label-sm ${
                                task.done ? "text-secondary font-semibold" : ""
                              }`}
                            >
                              {task.done ? "Completed" : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-unit-lg">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all"
                            title="View task"
                          >
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/tasks/${task.id}/edit`)
                            }
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all"
                            title="Edit task"
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-full transition-all"
                            title="Delete task"
                          >
                            <span className="material-symbols-outlined">
                              delete
                            </span>
                          </button>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                        />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-on-surface-variant">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} tasks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-outline-variant rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface font-label-md text-label-md"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-outline-variant rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface font-label-md text-label-md"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Floating Selection Button */}
          <FloatingSelectionButton
            selectedCount={selectedTasks.length}
            totalCount={tasks.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={() => setSelectedTasks([])}
            confirmButton={
              <button
                onClick={handleBulkDelete}
                className="w-full bg-error text-on-error py-2.5 px-4 rounded-xl hover:bg-error/90 transition-colors font-label-md text-label-md"
              >
                Delete Selected
              </button>
            }
            onConfirm={handleBulkDelete}
          />
        </div>
      </main>
    </div>
  );
}

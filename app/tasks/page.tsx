"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
      <main className="w-full max-w-[1280px] mx-auto px-5 bg-background min-h-screen">
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
                    Task Manager
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
                  onClick={() => router.push("/tasks/new")}
                  className="px-[24px] py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    add
                  </span>
                  Create Task
                </button>
              </div>
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-[24px]">
              {/* Left Column: Navigation/Summary */}
              <aside className="col-span-12 lg:col-span-3 flex flex-col gap-[24px]">
                <div className="p-[24px] bg-surface-container-low rounded-2xl flex flex-col gap-[16px]">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Task Progress
                  </h3>
                  <div className="relative h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-secondary transition-all duration-1000 ease-out rounded-full"
                      style={{
                        width: `${tasks.length > 0 ? (tasks.filter((t) => t.done).length / tasks.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {tasks.filter((t) => t.done).length} of {tasks.length} tasks
                    completed.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm font-label-sm rounded-full">
                      {tasks.length} Total
                    </span>
                    <span className="px-3 py-1 bg-surface-container-highest text-on-surface text-label-sm font-label-sm rounded-full">
                      {tasks.filter((t) => !t.done).length} Pending
                    </span>
                  </div>
                </div>
                <nav className="flex flex-col gap-1">
                  <a
                    className="flex items-center justify-between p-[24px] bg-primary text-on-primary rounded-xl transition-all shadow-md group"
                    href="#tasks"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                      <span className="font-label-md text-label-md">
                        All Tasks
                      </span>
                    </div>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                      chevron_right
                    </span>
                  </a>
                </nav>
              </aside>

              {/* Right Column: Tasks Dashboard */}
              <main className="col-span-12 lg:col-span-9 flex flex-col gap-[48px]">
                {/* Section: Tasks */}
                <div
                  className="p-[48px] bg-surface-container-lowest rounded-[32px] shadow-sm flex flex-col gap-[24px] transition-all duration-700 opacity-100 translate-y-0"
                  id="tasks"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h2 className="font-headline-lg text-headline-lg text-on-surface">
                        Tasks
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Manage your tasks and track progress
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-secondary text-[40px] opacity-20">
                      check_circle
                    </span>
                  </div>

                  {/* Filters and Search */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <form onSubmit={handleSearch} className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent text-on-surface placeholder:text-on-surface-variant"
                      />
                    </form>
                    <select
                      value={doneFilter}
                      onChange={(e) => setDoneFilter(e.target.value)}
                      className="p-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent text-on-surface"
                    >
                      <option value="">All Tasks</option>
                      <option value="false">Not Done</option>
                      <option value="true">Done</option>
                    </select>
                  </div>

                  {/* Bulk Actions */}
                  {selectedTasks.length > 0 && (
                    <div className="bg-primary-container rounded-xl p-4 border border-primary-container">
                      <div className="flex items-center justify-between">
                        <span className="text-on-primary-container">
                          {selectedTasks.length} task(s) selected
                        </span>
                        <button
                          onClick={handleBulkDelete}
                          className="bg-error text-on-error py-2 px-4 rounded-xl hover:bg-error/90 transition-colors font-label-md text-label-md"
                        >
                          Delete Selected
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="flex flex-col gap-[16px]">
                    {tasks.length === 0 ? (
                      <div className="bg-surface-container-low rounded-2xl p-8 text-center">
                        <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-20">
                          check_circle
                        </span>
                        <p className="text-on-surface-variant mt-4">
                          No tasks found
                        </p>
                        <p className="text-on-surface-variant text-sm mt-1">
                          Create your first task to get started
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Header Row */}
                        <div className="p-4 bg-surface-container-low rounded-xl flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedTasks.length === tasks.length}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                          />
                          <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-label-md text-on-surface-variant">
                            <div className="col-span-6">Title</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Deadline</div>
                            <div className="col-span-2">Actions</div>
                          </div>
                        </div>
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-4"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => handleSelectTask(task.id)}
                              className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                            />
                            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-6">
                                <div
                                  className={`font-body-md text-body-md cursor-pointer hover:text-secondary transition-colors ${
                                    task.done
                                      ? "line-through text-on-surface-variant"
                                      : "text-on-surface"
                                  }`}
                                  onClick={() =>
                                    router.push(`/tasks/${task.id}`)
                                  }
                                >
                                  {task.title}
                                </div>
                                {task.details && (
                                  <div className="text-sm text-on-surface-variant truncate">
                                    {task.details}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={task.done}
                                    onChange={() => handleToggleDone(task)}
                                    className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary"
                                  />
                                  <span
                                    className={`text-sm font-label-md ${
                                      task.done
                                        ? "text-secondary"
                                        : "text-on-surface-variant"
                                    }`}
                                  >
                                    {task.done ? "Done" : "Pending"}
                                  </span>
                                </label>
                              </div>
                              <div className="col-span-2 text-sm text-on-surface-variant">
                                {task.deadline
                                  ? new Date(task.deadline).toLocaleDateString()
                                  : "No deadline"}
                              </div>
                              <div className="col-span-2 flex gap-2">
                                <button
                                  onClick={() =>
                                    router.push(`/tasks/${task.id}`)
                                  }
                                  className="text-secondary hover:text-secondary/80 transition-colors p-2 hover:bg-surface-container rounded-lg"
                                  title="View task"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    router.push(`/tasks/${task.id}/edit`)
                                  }
                                  className="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container rounded-lg"
                                  title="Edit task"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    edit
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-error hover:text-error/80 transition-colors p-2 hover:bg-surface-container rounded-lg"
                                  title="Delete task"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    delete
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-on-surface-variant">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        )}{" "}
                        of {pagination.total} tasks
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setPagination({
                              ...pagination,
                              page: pagination.page - 1,
                            })
                          }
                          disabled={pagination.page === 1}
                          className="px-4 py-2 border border-outline-variant rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface font-label-md text-label-md"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setPagination({
                              ...pagination,
                              page: pagination.page + 1,
                            })
                          }
                          disabled={pagination.page === pagination.totalPages}
                          className="px-4 py-2 border border-outline-variant rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface font-label-md text-label-md"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

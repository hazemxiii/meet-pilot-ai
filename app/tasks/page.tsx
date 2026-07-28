"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStatusColor, getPriorityColor } from "@/utils/tasks/colors";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  tags: string[];
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
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
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
  }, [user, pagination.page, statusFilter, priorityFilter]);

  const fetchTasks = async (pageOverride?: number) => {
    try {
      const params = new URLSearchParams({
        page: (pageOverride ?? pagination.page).toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
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
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return;

    try {
      const response = await fetch(`/api/tasks/bulk?ids=${selectedTasks.join(",")}`, {
        method: "DELETE",
      });

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
        : [...selectedTasks, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedTasks(
      selectedTasks.length === tasks.length
        ? []
        : tasks.map((task) => task.id)
    );
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks</h1>
              <p className="text-gray-600">
                Manage your tasks and track progress
              </p>
            </div>
            <button
              onClick={() => router.push("/tasks/new")}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <form onSubmit={handleSearch} className="md:col-span-2">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </form>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTasks.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">
                {selectedTasks.length} task(s) selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-500">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">
                Create your first task to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="p-4 bg-gray-50 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                  <div className="col-span-4">Title</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Priority</div>
                  <div className="col-span-2">Due Date</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.id)}
                    onChange={() => handleSelectTask(task.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div
                        className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => router.push(`/tasks/${task.id}`)}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-gray-500 truncate">
                          {task.description}
                        </div>
                      )}
                      {task.tags.length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : "No due date"}
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View task"
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => router.push(`/tasks/${task.id}/edit`)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Edit task"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Delete task"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} tasks
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStatusColor, getPriorityColor } from "@/utils/tasks/colors";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignees: string[];
  start_date: string | null;
  due_date: string | null;
  time_estimate: number | null;
  sprint_points: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order_index: number;
}

interface Checklist {
  id: string;
  title: string;
  checklist_items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order_index: number;
}

interface TaskDependency {
  id: string;
  blocking_task: Task;
}

interface TaskAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTaskDetails();
    }
  }, [user, id]);

  const fetchTaskDetails = async () => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
        setSubtasks(data.subtasks || []);
        setChecklists(data.checklists || []);
        setDependencies(data.dependencies || []);
        setAttachments(data.attachments || []);
      } else {
        alert("Failed to load task");
        router.push("/tasks");
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      alert("Failed to load task");
      router.push("/tasks");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/tasks")}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                <p className="text-gray-600">
                  Created on {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/tasks/${task.id}/edit`)}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {task.description && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Subtasks */}
            {subtasks.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                </h2>
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        className="w-4 h-4 text-blue-600 rounded"
                        readOnly
                      />
                      <span
                        className={`flex-1 ${
                          subtask.completed ? "text-gray-500 line-through" : "text-gray-900"
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklists */}
            {checklists.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklists</h2>
                <div className="space-y-4">
                  {checklists.map((checklist) => (
                    <div key={checklist.id}>
                      <h3 className="font-medium text-gray-900 mb-2">{checklist.title}</h3>
                      <div className="space-y-2">
                        {checklist.checklist_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              className="w-4 h-4 text-blue-600 rounded"
                              readOnly
                            />
                            <span
                              className={`flex-1 ${
                                item.completed ? "text-gray-500 line-through" : "text-gray-900"
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <div className="flex-1">
                        <div className="text-gray-900">{attachment.file_name}</div>
                        <div className="text-sm text-gray-500">
                          {attachment.file_size && `${(attachment.file_size / 1024).toFixed(1)} KB`}
                        </div>
                      </div>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status.replace("_", " ")}
              </span>
            </div>

            {/* Priority */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Start Date</div>
                  <div className="text-gray-900">
                    {task.start_date
                      ? new Date(task.start_date).toLocaleString()
                      : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Due Date</div>
                  <div className="text-gray-900">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleString()
                      : "Not set"}
                  </div>
                </div>
              </div>
            </div>

            {/* Time Tracking */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Time Estimate</div>
                  <div className="text-gray-900">
                    {task.time_estimate
                      ? `${task.time_estimate} minutes`
                      : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Sprint Points</div>
                  <div className="text-gray-900">
                    {task.sprint_points || "Not set"}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignees */}
            {task.assignees.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignees</h2>
                <div className="space-y-2">
                  {task.assignees.map((assignee) => (
                    <div
                      key={assignee}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {assignee.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{assignee}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Blocked By ({dependencies.length})
                </h2>
                <div className="space-y-2">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tasks/${dep.blocking_task.id}`)}
                    >
                      <div className="text-gray-900 font-medium">
                        {dep.blocking_task.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dep.blocking_task.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

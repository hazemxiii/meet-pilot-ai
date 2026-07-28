"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TaskForm, { emptyTaskFormValues, TaskFormValues } from "@/components/TaskForm";

export default function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<TaskFormValues>(emptyTaskFormValues);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchTask();
    }
  }, [user, id]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        const task = data.task;
        setInitialValues({
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          assignees: task.assignees || [],
          start_date: task.start_date || "",
          due_date: task.due_date || "",
          time_estimate: task.time_estimate?.toString() || "",
          sprint_points: task.sprint_points?.toString() || "",
          tags: task.tags || [],
        });
      } else {
        alert("Failed to load task");
        router.push("/tasks");
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      alert("Failed to load task");
      router.push("/tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: TaskFormValues) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          time_estimate: formData.time_estimate ? parseInt(formData.time_estimate) : null,
          sprint_points: formData.sprint_points ? parseInt(formData.sprint_points) : null,
        }),
      });

      if (response.ok) {
        router.push("/tasks");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Task</h1>
              <p className="text-gray-600">Update the task details below</p>
            </div>
            <button
              onClick={() => router.push("/tasks")}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Tasks
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <TaskForm
            initialValues={initialValues}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/tasks")}
            submitLabel="Update Task"
            submittingLabel="Updating..."
          />
        </div>
      </div>
    </div>
  );
}

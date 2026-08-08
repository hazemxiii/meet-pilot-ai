"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TaskForm, {
  emptyTaskFormValues,
  TaskFormValues,
} from "@/components/TaskForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit3 } from "lucide-react";

export default function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] =
    useState<TaskFormValues>(emptyTaskFormValues);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const response = await fetch(`/api/tasks/${id}`);
        if (response.ok) {
          const data = await response.json();
          const task = data.task;
          setInitialValues({
            title: task.title,
            details: task.details || "",
            done: task.done,
            deadline: task.deadline || "",
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
    })();
  }, [user, id, router]);

  const handleUpdate = async (formData: TaskFormValues) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Edit3 className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Task Manager
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Edit Task
            </h1>
            <p className="text-muted-foreground">Update the task details below</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/tasks")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <TaskForm
              initialValues={initialValues}
              onSubmit={handleUpdate}
              onCancel={() => router.push("/tasks")}
              submitLabel="Update Task"
              submittingLabel="Updating..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

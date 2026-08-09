"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TaskForm, {
  emptyTaskFormValues,
  TaskFormValues,
} from "@/components/TaskForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function NewTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleCreate = async (formData: TaskFormValues) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/tasks");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task");
    }
  };

  if (loading) {
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
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Task Manager
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Create New Task
            </h1>
            <p className="text-muted-foreground">
              Fill in the details below to create a new task
            </p>
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
              initialValues={emptyTaskFormValues}
              onSubmit={handleCreate}
              onCancel={() => router.push("/tasks")}
              submitLabel="Create Task"
              submittingLabel="Creating..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getDoneColor } from "@/utils/tasks/colors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit3, Paperclip, CheckCircle2, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  details: string;
  done: boolean;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskFile {
  id: string;
  mime_type: string;
  file_path: string;
  created_at: string;
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
  const [files, setFiles] = useState<TaskFile[]>([]);

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
          setTask(data.task);
          setFiles(data.files || []);
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
    })();
  }, [user, id, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user || !task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/tasks")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                {task.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Created on {new Date(task.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push(`/tasks/${task.id}/edit`)} className="gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Task
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Details */}
            {task.details && (
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {task.details}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Files */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border hover:bg-muted/80 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-md bg-background flex items-center justify-center border">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{file.file_path}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.mime_type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge 
                  variant={task.done ? "default" : "secondary"} 
                  className="text-sm py-1 px-3"
                >
                  {task.done ? "Completed" : "In Progress"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Deadline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "No deadline set"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

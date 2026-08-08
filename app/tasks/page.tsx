"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import FloatingSelectionButton from "@/components/FloatingSelectionButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Search, Plus, CalendarIcon, Clock, Eye, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [doneFilter, setDoneFilter] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });

        if (doneFilter !== "all") params.append("done", doneFilter);
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
    })();
  }, [user, pagination.page, pagination.limit, doneFilter, searchQuery, refreshKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pagination.page !== 1) {
      setPagination({ ...pagination, page: 1 });
    } else {
      setRefreshKey((key) => key + 1);
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
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-widest uppercase opacity-80">
                Task Manager
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Action Items</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-64 bg-background"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              />
            </div>
            <Button onClick={() => router.push("/tasks/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {tasks.filter((t) => !t.done).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {tasks.filter((t) => t.done).length}
                </div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.done).length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          <Select value={doneFilter} onValueChange={(val) => setDoneFilter(val || "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
              <SelectItem value="true">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="py-12 border-dashed">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">No tasks found</h3>
                  <p className="text-muted-foreground">
                    Create your first task to get started
                  </p>
                </div>
                <Button onClick={() => router.push("/tasks/new")}>
                  Create Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  task.done && "bg-muted/30"
                )}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={() => handleToggleDone(task)}
                    className="mt-1 h-5 w-5 rounded-md"
                  />
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <h3
                        className={cn(
                          "font-semibold text-lg cursor-pointer hover:text-primary transition-colors",
                          task.done && "line-through text-muted-foreground"
                        )}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                      >
                        {task.title}
                      </h3>
                      {task.details && (
                        <p className="text-sm text-muted-foreground">
                          {task.details}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        {task.deadline && (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                        <Badge
                          variant={task.done ? "default" : "outline"}
                          className="gap-1 font-normal"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {task.done ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/tasks/${task.id}/edit`)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => handleSelectTask(task.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} tasks
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <FloatingSelectionButton
          selectedCount={selectedTasks.length}
          totalCount={tasks.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={() => setSelectedTasks([])}
          confirmButton={
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          }
          onConfirm={handleBulkDelete}
        />
      </div>
    </div>
  );
}

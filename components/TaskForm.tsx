"use client";

import { useState } from "react";

export interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignees: string[];
  start_date: string;
  due_date: string;
  time_estimate: string;
  sprint_points: string;
  tags: string[];
}

export const emptyTaskFormValues: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignees: [],
  start_date: "",
  due_date: "",
  time_estimate: "",
  sprint_points: "",
  tags: [],
};

interface TaskFormProps {
  initialValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
}

export default function TaskForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const addAssignee = () => {
    if (assigneeInput.trim() && !formData.assignees.includes(assigneeInput.trim())) {
      setFormData({ ...formData, assignees: [...formData.assignees, assigneeInput.trim()] });
      setAssigneeInput("");
    }
  };

  const removeAssignee = (assigneeToRemove: string) => {
    setFormData({
      ...formData,
      assignees: formData.assignees.filter((assignee) => assignee !== assigneeToRemove),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter task title"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Enter task description"
        />
      </div>

      {/* Status and Priority */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date
          </label>
          <input
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Time Estimate and Sprint Points */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Estimate (minutes)
          </label>
          <input
            type="number"
            value={formData.time_estimate}
            onChange={(e) => setFormData({ ...formData, time_estimate: e.target.value })}
            min="0"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter time estimate"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sprint Points
          </label>
          <input
            type="number"
            value={formData.sprint_points}
            onChange={(e) => setFormData({ ...formData, sprint_points: e.target.value })}
            min="0"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter sprint points"
          />
        </div>
      </div>

      {/* Assignees */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignees
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAssignee())}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter assignee email"
          />
          <button
            type="button"
            onClick={addAssignee}
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add
          </button>
        </div>
        {formData.assignees.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.assignees.map((assignee) => (
              <span
                key={assignee}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {assignee}
                <button
                  type="button"
                  onClick={() => removeAssignee(assignee)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tag"
          />
          <button
            type="button"
            onClick={addTag}
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim()}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

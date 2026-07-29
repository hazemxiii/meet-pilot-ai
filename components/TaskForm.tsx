"use client";

import { useState } from "react";

export interface TaskFormValues {
  title: string;
  details: string;
  done: boolean;
  deadline: string;
}

export const emptyTaskFormValues: TaskFormValues = {
  title: "",
  details: "",
  done: false,
  deadline: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-label-md text-on-surface mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full p-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent text-on-surface placeholder:text-on-surface-variant"
          placeholder="Enter task title"
        />
      </div>

      {/* Details */}
      <div>
        <label className="block text-sm font-label-md text-on-surface mb-2">
          Details
        </label>
        <textarea
          value={formData.details}
          onChange={(e) =>
            setFormData({ ...formData, details: e.target.value })
          }
          rows={4}
          className="w-full p-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent resize-none text-on-surface placeholder:text-on-surface-variant"
          placeholder="Enter task details"
        />
      </div>

      {/* Deadline and Done */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-label-md text-on-surface mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
            className="w-full p-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent text-on-surface"
          />
        </div>
        <div className="flex items-end pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.done}
              onChange={(e) =>
                setFormData({ ...formData, done: e.target.checked })
              }
              className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary"
            />
            <span className="text-sm font-label-md text-on-surface">Done</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-surface-container-high text-on-surface-variant py-2 px-6 rounded-xl hover:bg-surface-container-highest transition-colors font-label-md text-label-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim()}
          className="bg-primary text-on-primary py-2 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:bg-surface-container-high disabled:cursor-not-allowed font-label-md text-label-md"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

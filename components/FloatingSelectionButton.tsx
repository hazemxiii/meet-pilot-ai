"use client";

import { ReactNode, useState } from "react";

interface FloatingSelectionButtonProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  confirmButton: ReactNode;
  onConfirm: () => void;
}

export default function FloatingSelectionButton({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  confirmButton,
  onConfirm,
}: FloatingSelectionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-primary text-on-primary px-5 py-3 rounded-full shadow-2xl hover:shadow-primary/30 transition-all duration-300 flex items-center gap-3 hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            check_circle
          </span>
          <span className="font-label-md text-label-md font-medium">
            {selectedCount} selected
          </span>
          <span className="material-symbols-outlined text-[20px]">
            expand_less
          </span>
        </button>
      ) : (
        <div className="bg-surface-container-high/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5 min-w-[300px] border border-outline/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                check_circle
              </span>
              <div>
                <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                  {selectedCount}
                </span>
                <span className="text-label-sm text-on-surface-variant ml-1">
                  / {totalCount} selected
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                close
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={onSelectAll}
              disabled={selectedCount === totalCount}
              className="flex-1 px-4 py-2.5 bg-surface-container rounded-2xl font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="flex-1 px-4 py-2.5 bg-surface-container rounded-2xl font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              Deselect
            </button>
          </div>

          <div onClick={onConfirm} className="cursor-pointer">
            {confirmButton}
          </div>
        </div>
      )}
    </div>
  );
}

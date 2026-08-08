"use client";

import { ReactNode, useState } from "react";
import { CheckCircle2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
        <Button
          size="lg"
          className="rounded-full shadow-xl gap-2 transition-transform hover:scale-105"
          onClick={() => setIsExpanded(true)}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>{selectedCount} selected</span>
          <ChevronUp className="h-5 w-5" />
        </Button>
      ) : (
        <Card className="p-5 min-w-[300px] shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-primary h-6 w-6" />
              <div>
                <span className="font-semibold text-foreground">
                  {selectedCount}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  / {totalCount} selected
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSelectAll}
              disabled={selectedCount === totalCount}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
            >
              Deselect
            </Button>
          </div>

          <div onClick={onConfirm} className="cursor-pointer">
            {confirmButton}
          </div>
        </Card>
      )}
    </div>
  );
}

import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SponsorOrderControlsProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}

export function SponsorOrderControls({
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  disabled = false,
}: SponsorOrderControlsProps) {
  return (
    <div className="flex flex-col gap-0.5 items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveUp}
        disabled={disabled || isFirst}
        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
        title="Move up"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveDown}
        disabled={disabled || isLast}
        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
        title="Move down"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

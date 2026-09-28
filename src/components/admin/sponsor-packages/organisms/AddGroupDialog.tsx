import { useState, type FormEvent } from "react";
import { Plus, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AddGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (label: string) => Promise<void>;
  existingLabels: string[];
}

export function AddGroupDialog({
  open,
  onOpenChange,
  onCreateGroup,
  existingLabels,
}: AddGroupDialogProps) {
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Group label is required.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Group label must be 80 characters or fewer.");
      return;
    }
    if (existingLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setError("A group with this label already exists.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await onCreateGroup(trimmed);
      setLabel("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border sm:rounded-2xl p-6">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Add Package Group
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a new categorization section for sponsor packages (e.g. "On-Site Collateral").
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Group Label *</Label>
            <Input
              required
              maxLength={80}
              placeholder="e.g. Physical & On-Site"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError(null);
              }}
              className="bg-background text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="cursor-pointer font-semibold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

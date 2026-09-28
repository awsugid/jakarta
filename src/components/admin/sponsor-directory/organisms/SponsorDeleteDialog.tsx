import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface SponsorDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sponsorName?: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function SponsorDeleteDialog({
  isOpen,
  onOpenChange,
  sponsorName,
  onConfirm,
  isDeleting,
}: SponsorDeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-lg">
            <Trash2 className="h-5 w-5" />
            Delete Sponsor
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-2">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{sponsorName}</strong>? This action cannot be undone and will remove the sponsor from public display.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5 text-xs"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Edit2, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SponsorActionButtonsProps {
  websiteUrl?: string | null;
  isActive: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isUpdating?: boolean;
}

export function SponsorActionButtons({
  websiteUrl,
  isActive,
  onToggleActive,
  onEdit,
  onDelete,
  isUpdating = false,
}: SponsorActionButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {websiteUrl && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          asChild
          title="Visit Website"
        >
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open sponsor website"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        disabled={isUpdating}
        onClick={onToggleActive}
        title={isActive ? "Deactivate (Hide from site)" : "Activate (Show on site)"}
        className={`h-8 w-8 ${
          isActive
            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        title="Edit Sponsor"
        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
      >
        <Edit2 className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        title="Delete Sponsor"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

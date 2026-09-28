import { useState } from "react";
import { Eye, Image as ImageIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PLACEMENT_PRESETS } from "../types";
import { SponsorPlacementThumbnail } from "../atoms/SponsorPlacementThumbnail";
import { DEFAULT_PLACEMENT_IMAGE } from "@/components/sponsor/communityDayConfig";

interface SponsorPlacementEditorProps {
  packageId: string;
  packageName: string;
  imageUrl: string;
  onChangeImageUrl: (url: string) => void;
  defaultPresetUrl?: string;
}

export function SponsorPlacementEditor({
  packageName,
  imageUrl,
  onChangeImageUrl,
  defaultPresetUrl = DEFAULT_PLACEMENT_IMAGE,
}: SponsorPlacementEditorProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const currentUrl = imageUrl.trim() || defaultPresetUrl;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <Label className="text-xs font-semibold text-foreground">
            Ad Placement Visual Asset
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview Visual
          </Button>
          {imageUrl.trim() !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChangeImageUrl("")}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 cursor-pointer"
              title="Reset to default asset"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SponsorPlacementThumbnail
          url={currentUrl}
          alt={`${packageName} visual`}
          className="w-20 h-14 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
        />

        <div className="flex-1 w-full space-y-1.5">
          <Input
            type="url"
            placeholder="Image URL (e.g. https://avatars.awscommunity.id/comday-26/...)"
            value={imageUrl}
            onChange={(e) => onChangeImageUrl(e.target.value)}
            className="h-8 text-xs font-mono bg-background"
          />

          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Presets:</span>
            {PLACEMENT_PRESETS.map((preset) => {
              const isActive = currentUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeImageUrl(preset.url)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightbox / Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-xl overflow-hidden p-0 bg-card border-border sm:rounded-2xl">
          <div className="relative w-full aspect-video bg-muted/40 border-b border-border flex items-center justify-center overflow-hidden">
            <img
              src={currentUrl}
              alt={`${packageName} preview`}
              className="w-full h-full object-contain p-4"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_PLACEMENT_IMAGE;
              }}
            />
            <Badge variant="secondary" className="absolute top-3 left-3 bg-background/80 backdrop-blur-md text-xs font-semibold">
              Preview Mode
            </Badge>
          </div>
          <div className="p-4 space-y-2">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {packageName} — Placement Visual
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground break-all font-mono">
                {currentUrl}
              </DialogDescription>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

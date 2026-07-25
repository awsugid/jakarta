"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type {
  LinkBackground,
  LinkButtonStyle,
  LinkIcon,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Validation helpers (mirror contract; reject javascript:/data: client-side)
// ---------------------------------------------------------------------------
export const URL_MAX = 2048;
export const TITLE_MAX = 100;
export const BIO_MAX = 300;
export const LABEL_MAX = 80;

export function validateTitle(v: string): string | null {
  const s = (v ?? "").trim();
  if (s.length === 0) return "Title is required.";
  if ((v ?? "").length > TITLE_MAX)
    return `Title must be ${TITLE_MAX} characters or fewer.`;
  return null;
}

export function validateBio(v: string): string | null {
  if ((v ?? "").length > BIO_MAX)
    return `Bio must be ${BIO_MAX} characters or fewer.`;
  return null;
}

export function validateLabel(v: string): string | null {
  const s = (v ?? "").trim();
  if (s.length === 0) return "Label is required.";
  if ((v ?? "").length > LABEL_MAX)
    return `Label must be ${LABEL_MAX} characters or fewer.`;
  return null;
}

export function validateUrl(v: string): string | null {
  const s = (v ?? "").trim();
  if (s.length === 0) return "URL is required.";
  if (s.length > URL_MAX) return `URL must be ${URL_MAX} characters or fewer.`;
  const lower = s.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return "Only http and https URLs are allowed.";
  }
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return "URL must start with http:// or https://.";
  }
  return null;
}

// -----------------------------------------------------------------------------
// Re-export canonical types so existing consumers (LinkManager) keep working.
// -----------------------------------------------------------------------------
export type { LinkBackground, LinkButtonStyle, LinkIcon };

export interface PageFormValues {
  title: string;
  bio: string;
  avatarUrl: string;
  background: LinkBackground;
  buttonStyle: LinkButtonStyle;
}

export interface LinkFormValues {
  label: string;
  url: string;
  icon: LinkIcon;
  isEnabled: boolean;
}

export const BACKGROUNDS: LinkBackground[] = ["dark", "gradient", "mesh"];
export const BUTTON_STYLES: LinkButtonStyle[] = ["solid", "outline", "soft"];
export const ICON_ALLOWLIST: LinkIcon[] = [
  "link",
  "github",
  "linkedin",
  "twitter",
  "instagram",
  "youtube",
  "globe",
  "mail",
  "calendar",
  "map-pin",
  "users",
  "external-link",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type LinkEditorVariant = "page" | "link";

type PageProps = {
  variant: "page";
  initial: PageFormValues;
  onSave: (v: PageFormValues) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
  serverError?: string | null;
};

type LinkProps = {
  variant: "link";
  initial?: Partial<LinkFormValues> & { id?: string };
  onSave: (v: LinkFormValues, id?: string) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
  serverError?: string | null;
};

export type LinkEditorProps = PageProps | LinkProps;

export function LinkEditor(props: LinkEditorProps) {
  return props.variant === "page" ? (
    <PageEditor {...props} />
  ) : (
    <LinkForm {...props} />
  );
}

// ---------------------------------------------------------------------------
// Page settings editor
// ---------------------------------------------------------------------------
function PageEditor({
  initial,
  onSave,
  saving,
  serverError,
}: PageProps) {
  const [title, setTitle] = useState(initial.title);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [background, setBackground] = useState<LinkBackground>(
    initial.background,
  );
  const [buttonStyle, setButtonStyle] = useState<LinkButtonStyle>(
    initial.buttonStyle,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSave() {
    const next: Record<string, string> = {};
    const t = validateTitle(title);
    if (t) next.title = t;
    const b = validateBio(bio);
    if (b) next.bio = b;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSave({
      title: title.trim(),
      bio,
      avatarUrl: avatarUrl.trim(),
      background,
      buttonStyle,
    });
  }

  return (
    <div className="space-y-4">
      <Field
        id="link-page-title"
        label="Title"
        error={errors.title}
        hint={`${title.length}/${TITLE_MAX}`}
      >
        <Input
          id="link-page-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="AWS User Group Jakarta"
          aria-invalid={!!errors.title}
        />
      </Field>

      <Field
        id="link-page-bio"
        label="Bio"
        error={errors.bio}
        hint={`${bio.length}/${BIO_MAX}`}
      >
        <Textarea
          id="link-page-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Short community bio"
          aria-invalid={!!errors.bio}
        />
      </Field>

      <Field id="link-page-avatar" label="Avatar URL">
        <Input
          id="link-page-avatar"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…/avatar.png"
          inputMode="url"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="link-page-background" label="Background">
          <Select
            value={background}
            onValueChange={(v) => setBackground(v as LinkBackground)}
          >
            <SelectTrigger id="link-page-background" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BACKGROUNDS.map((b) => (
                <SelectItem key={b} value={b} className="capitalize">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="link-page-button-style" label="Button style">
          <Select
            value={buttonStyle}
            onValueChange={(v) => setButtonStyle(v as LinkButtonStyle)}
          >
            <SelectTrigger
              id="link-page-button-style"
              className="bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_STYLES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-link form
// ---------------------------------------------------------------------------
function LinkForm({ initial, onSave, onCancel, saving, serverError }: LinkProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [icon, setIcon] = useState<LinkIcon>(initial?.icon ?? "link");
  const [isEnabled, setIsEnabled] = useState<boolean>(
    initial?.isEnabled ?? true,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const next: Record<string, string> = {};
    const l = validateLabel(label);
    if (l) next.label = l;
    const u = validateUrl(url);
    if (u) next.url = u;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSave(
      {
        label: label.trim(),
        url: url.trim(),
        icon,
        isEnabled,
      },
      initial?.id,
    );
  }

  return (
    <div className="space-y-4">
      <Field id="link-item-label" label="Label" error={errors.label}>
        <Input
          id="link-item-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={LABEL_MAX}
          placeholder="Monthly Meetup"
          autoFocus
          aria-invalid={!!errors.label}
        />
      </Field>

      <Field id="link-item-url" label="URL" error={errors.url}>
        <Input
          id="link-item-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://meetup.com/…"
          inputMode="url"
          aria-invalid={!!errors.url}
        />
      </Field>

      <Field id="link-item-icon" label="Icon">
        <Select
          value={icon}
          onValueChange={(v) => setIcon(v as LinkIcon)}
        >
          <SelectTrigger id="link-item-icon" className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_ALLOWLIST.map((name) => (
              <SelectItem key={name} value={name} className="capitalize">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <Checkbox
          checked={isEnabled}
          onCheckedChange={(v) => setIsEnabled(v === true)}
          aria-label="Enabled"
        />
        Enabled
      </label>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial?.id ? "Save changes" : "Add link"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type { LinkEditorVariant };

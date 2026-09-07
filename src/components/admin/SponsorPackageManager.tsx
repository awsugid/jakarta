"use client";

import {
  useCallback,
  useEffect,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMMUNITY_DAY_EVENT_SLUG,
  formatIDR,
} from "@/components/sponsor/communityDayConfig";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  createSponsorPackage,
  createSponsorPackageGroup,
  createSponsorTier,
  deleteSponsorPackage,
  deleteSponsorPackageGroup,
  deleteSponsorTier,
  fetchSponsorPackages,
  updateAdminSponsorPackages,
  updateSponsorTiers,
} from "@/lib/api";
import type {
  SponsorPackage,
  SponsorPackageGroup,
  SponsorPackageGroupUpdate,
  SponsorPackageUpdate,
  SponsorPackagesResponse,
  SponsorTier,
  SponsorTierAccent,
  SponsorTierUpdate,
} from "@/lib/types";


const MAX_IDR = 1_000_000_000;
const MAX_SPONSORS_LIMIT = 10_000;
const MAX_GROUP_LABEL = 80;
const MAX_PACKAGE_NAME = 80;
const MAX_ADVANTAGE = 500;
const MAX_TIER_LABEL = 60;
const MAX_TIERS = 10;

interface PackageDraft {
  groupId: string;
  price: string;
  /** Empty string = no spend requirement. */
  minSpend: string;
  /** Empty string = unlimited (null). */
  maxSponsors: string;
  reservedSponsors: string;
  isUnlocked: boolean;
}

interface GroupDraft {
  label: string;
  displayOrder: number;
}

interface TierDraft {
  label: string;
  threshold: string;
  accent: SponsorTierAccent;
}

/** Fixed accent allowlist mirrored from the backend. */
const TIER_ACCENTS: SponsorTierAccent[] = [
  "platinum",
  "gold",
  "silver",
  "bronze",
  "default",
];

/** Which entity currently has an inline delete confirmation open. */
type DeleteTarget =
  | { kind: "package"; id: string; name: string }
  | { kind: "group"; id: string; name: string }
  | { kind: "tier"; id: string; name: string };

function toPackageDrafts(
  packages: SponsorPackage[],
): Record<string, PackageDraft> {
  const drafts: Record<string, PackageDraft> = {};
  for (const p of packages) {
    drafts[p.id] = {
      groupId: p.groupId ?? "",
      price: String(p.priceIdr),
      minSpend: p.minimumSpendIdr == null ? "" : String(p.minimumSpendIdr),
      maxSponsors: p.maxSponsors == null ? "" : String(p.maxSponsors),
      reservedSponsors: String(p.reservedSponsors ?? 0),
      isUnlocked: p.isUnlocked,
    };
  }
  return drafts;
}

function toGroupDrafts(
  groups: SponsorPackageGroup[],
): Record<string, GroupDraft> {
  const drafts: Record<string, GroupDraft> = {};
  for (const g of groups) {
    drafts[g.id] = { label: g.label, displayOrder: g.displayOrder };
  }
  return drafts;
}

function toTierDrafts(tiers: SponsorTier[]): Record<string, TierDraft> {
  const drafts: Record<string, TierDraft> = {};
  for (const t of tiers) {
    drafts[t.id] = {
      label: t.label,
      threshold: String(t.thresholdIdr),
      accent: t.accent,
    };
  }
  return drafts;
}

function parsePriceIdr(value: string): number | null {
  const v = value.trim();
  if (!/^\d+$/.test(v)) return null;
  return Number(v);
}

function priceError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Price is required.";
  if (!/^\d+$/.test(v)) return "Enter whole rupiah digits only.";
  const n = Number(v);
  if (n < 1) return "Price must be at least IDR 1.";
  if (n > MAX_IDR) return "Price cannot exceed IDR 1,000,000,000.";
  return null;
}

/** Empty string means "no requirement" (null); digit-only strings parse. */
function parseMinimumSpendIdr(value: string): number | null {
  const v = value.trim();
  if (!v || !/^\d+$/.test(v)) return null;
  return Number(v);
}

function minimumSpendError(value: string): string | null {
  const v = value.trim();
  if (!v) return null; // optional: empty = no spend requirement
  if (!/^\d+$/.test(v)) return "Enter whole rupiah digits only.";
  const n = Number(v);
  if (n < 1) return "Minimum spend must be at least IDR 1.";
  if (n > MAX_IDR) return "Minimum spend cannot exceed IDR 1,000,000,000.";
  return null;
}

/** Empty string means "unlimited" (null); digit-only strings parse. */
function parseMaxSponsors(value: string): number | null {
  const v = value.trim();
  if (!v || !/^\d+$/.test(v)) return null;
  return Number(v);
}

function maxSponsorsError(value: string): string | null {
  const v = value.trim();
  if (!v) return null; // optional: empty = unlimited
  if (!/^\d+$/.test(v)) return "Enter whole digits only.";
  const n = Number(v);
  if (n < 1) return "Maximum sponsors must be at least 1.";
  if (n > MAX_SPONSORS_LIMIT) return "Maximum sponsors cannot exceed 10,000.";
  return null;
}

function parseReservedSponsors(value: string): number {
  const v = value.trim();
  return /^\d+$/.test(v) ? Number(v) : 0;
}

/** Reserved is required (0..=10000) and must not exceed the max when one is set. */
function reservedSponsorsError(maxValue: string, value: string): string | null {
  const v = value.trim();
  if (!v) return "Reserved sponsors is required.";
  if (!/^\d+$/.test(v)) return "Enter whole digits only.";
  const n = Number(v);
  if (n > MAX_SPONSORS_LIMIT) return "Reserved sponsors cannot exceed 10,000.";
  const max = parseMaxSponsors(maxValue);
  if (max !== null && n > max) return "Reserved cannot exceed maximum sponsors.";
  return null;
}

function groupLabelError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Group label is required.";
  if (v.length > MAX_GROUP_LABEL)
    return "Group label must be 80 characters or fewer.";
  return null;
}

function packageNameError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Package name is required.";
  if (v.length > MAX_PACKAGE_NAME)
    return "Package name must be 80 characters or fewer.";
  return null;
}

function advantageError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Benefit description is required.";
  if (v.length > MAX_ADVANTAGE)
    return "Benefit description must be 500 characters or fewer.";
  return null;
}

function tierLabelError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Tier label is required.";
  if (v.length > MAX_TIER_LABEL)
    return "Tier label must be 60 characters or fewer.";
  return null;
}

function tierThresholdError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Threshold is required.";
  if (!/^\d+$/.test(v)) return "Enter whole rupiah digits only.";
  const n = Number(v);
  if (n < 1) return "Threshold must be at least IDR 1.";
  if (n > MAX_IDR) return "Threshold cannot exceed IDR 1,000,000,000.";
  return null;
}

function isDirty(
  pkg: SponsorPackage,
  draft: PackageDraft | undefined,
): boolean {
  if (!draft) return false;
  return (
    draft.groupId !== (pkg.groupId ?? "") ||
    draft.price.trim() !== String(pkg.priceIdr) ||
    draft.minSpend.trim() !==
      (pkg.minimumSpendIdr == null ? "" : String(pkg.minimumSpendIdr)) ||
    draft.maxSponsors.trim() !==
      (pkg.maxSponsors == null ? "" : String(pkg.maxSponsors)) ||
    draft.reservedSponsors.trim() !== String(pkg.reservedSponsors ?? 0) ||
    draft.isUnlocked !== pkg.isUnlocked
  );
}

function isGroupDirty(
  group: SponsorPackageGroup,
  draft: GroupDraft | undefined,
): boolean {
  if (!draft) return false;
  return draft.label !== group.label || draft.displayOrder !== group.displayOrder;
}

function isTierDirty(
  tier: SponsorTier,
  draft: TierDraft | undefined,
): boolean {
  if (!draft) return false;
  return (
    draft.label !== tier.label ||
    draft.threshold.trim() !== String(tier.thresholdIdr) ||
    draft.accent !== tier.accent
  );
}

// ---------------------------------------------------------------------------
// SponsorPackageManager
// ---------------------------------------------------------------------------
export function SponsorPackageManager() {
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [groups, setGroups] = useState<SponsorPackageGroup[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PackageDraft>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<string, GroupDraft>>({});
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [showAddPackageGroupId, setShowAddPackageGroupId] = useState<
    string | null
  >(null);
  const [newPackage, setNewPackage] = useState({
    name: "",
    advantage: "",
    price: "",
  });
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [createPackageError, setCreatePackageError] = useState<string | null>(
    null,
  );
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTier, setNewTier] = useState<NewTierInput>({
    label: "",
    threshold: "",
    accent: "default",
  });
  const [creatingTier, setCreatingTier] = useState(false);
  const [createTierError, setCreateTierError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dragPackageId, setDragPackageId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(
    null,
  );

  // Public GET is intentional here: it returns locked + unlocked rows, so the
  // admin token is only needed for the PUT.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSponsorPackages(COMMUNITY_DAY_EVENT_SLUG);
      setPackages(data.packages ?? []);
      setDrafts(toPackageDrafts(data.packages ?? []));
      setGroups(data.groups ?? []);
      setGroupDrafts(toGroupDrafts(data.groups ?? []));
      setTiers(data.tiers ?? []);
      setTierDrafts(toTierDrafts(data.tiers ?? []));
      setSaveError(null);
      // A pending confirm can reference a row that no longer exists after a
      // reload; clearing it keeps drag/delete from staying blocked.
      setConfirmDelete(null);
      setDeleteError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load sponsor packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- derived state -------------------------------------------------------

  const groupOrder = (g: SponsorPackageGroup) =>
    groupDrafts[g.id]?.displayOrder ?? g.displayOrder;

  const sortedGroups = [...groups].sort(
    (a, b) => groupOrder(a) - groupOrder(b) || a.id.localeCompare(b.id),
  );

  // Draft-aware threshold (parsed from the input, falling back to the stored
  // value) drives both display order and duplicate detection.
  const tierThresholdValue = (t: SponsorTier) =>
    parsePriceIdr(tierDrafts[t.id]?.threshold ?? "") ?? t.thresholdIdr;

  // Rows render in threshold-descending order — the same order tiers are
  // evaluated in (highest matching threshold wins).
  const sortedTiers = [...tiers].sort(
    (a, b) =>
      tierThresholdValue(b) - tierThresholdValue(a) || a.id.localeCompare(b.id),
  );

  const groupIdSet = new Set(groups.map((g) => g.id));

  // Uniqueness tallies across ALL groups (draft-aware, not just dirty ones).
  const labelCounts = new Map<string, number>();
  const orderCounts = new Map<number, number>();
  for (const g of groups) {
    const label = (groupDrafts[g.id]?.label ?? "").trim().toLowerCase();
    if (label) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    const order = groupOrder(g);
    orderCounts.set(order, (orderCounts.get(order) ?? 0) + 1);
  }

  // Tier uniqueness tallies across ALL tiers (draft-aware, valid parses only).
  const tierLabelCounts = new Map<string, number>();
  const tierThresholdCounts = new Map<number, number>();
  for (const t of tiers) {
    const label = (tierDrafts[t.id]?.label ?? "").trim().toLowerCase();
    if (label) tierLabelCounts.set(label, (tierLabelCounts.get(label) ?? 0) + 1);
    const threshold = parsePriceIdr(tierDrafts[t.id]?.threshold ?? "");
    if (threshold !== null)
      tierThresholdCounts.set(
        threshold,
        (tierThresholdCounts.get(threshold) ?? 0) + 1,
      );
  }

  const groupError = (g: SponsorPackageGroup): string | null => {
    const label = groupDrafts[g.id]?.label ?? "";
    const base = groupLabelError(label);
    if (base) return base;
    if ((labelCounts.get(label.trim().toLowerCase()) ?? 0) > 1)
      return "Group labels must be unique.";
    if ((orderCounts.get(groupOrder(g)) ?? 0) > 1)
      return "Display order must be unique.";
    return null;
  };

  const packageGroupError = (p: SponsorPackage): string | null => {
    const groupId = drafts[p.id]?.groupId ?? p.groupId ?? "";
    return groupIdSet.has(groupId)
      ? null
      : "This package references a group that no longer exists.";
  };

  const tierLabelRowError = (t: SponsorTier): string | null => {
    const label = tierDrafts[t.id]?.label ?? "";
    return (
      tierLabelError(label) ??
      ((tierLabelCounts.get(label.trim().toLowerCase()) ?? 0) > 1
        ? "Tier labels must be unique."
        : null)
    );
  };

  const tierThresholdRowError = (t: SponsorTier): string | null => {
    const value = tierDrafts[t.id]?.threshold ?? "";
    const base = tierThresholdError(value);
    if (base) return base;
    const parsed = parsePriceIdr(value);
    return parsed !== null && (tierThresholdCounts.get(parsed) ?? 0) > 1
      ? "Thresholds must be unique — a duplicate makes tier assignment ambiguous."
      : null;
  };

  // Draft-aware uniqueness makes the new-label duplicate check case-insensitive.
  const newGroupLabelError = showAddGroup
    ? groupLabelError(newGroupLabel) ??
      (labelCounts.has(newGroupLabel.trim().toLowerCase())
        ? "Group labels must be unique."
        : null)
    : null;

  const existingPackageNames = new Set(
    packages.map((p) => p.name.trim().toLowerCase()),
  );
  const newPackageErrors = showAddPackageGroupId
    ? {
        name:
          packageNameError(newPackage.name) ??
          (existingPackageNames.has(newPackage.name.trim().toLowerCase())
            ? "A package with this name already exists."
            : null),
        advantage: advantageError(newPackage.advantage),
        price: priceError(newPackage.price),
      }
    : null;

  const existingTierLabels = new Set(
    tiers.map((t) => t.label.trim().toLowerCase()),
  );
  const existingTierThresholds = new Set(tiers.map((t) => t.thresholdIdr));
  const newTierErrors = showAddTier
    ? {
        label:
          tierLabelError(newTier.label) ??
          (existingTierLabels.has(newTier.label.trim().toLowerCase())
            ? "A tier with this label already exists."
            : null),
        threshold:
          tierThresholdError(newTier.threshold) ??
          (existingTierThresholds.has(parsePriceIdr(newTier.threshold) ?? -1)
            ? "Thresholds must be unique."
            : null),
      }
    : null;

  const packageInvalid = (p: SponsorPackage): boolean =>
    priceError(drafts[p.id]?.price ?? "") !== null ||
    minimumSpendError(drafts[p.id]?.minSpend ?? "") !== null ||
    maxSponsorsError(drafts[p.id]?.maxSponsors ?? "") !== null ||
    reservedSponsorsError(
      drafts[p.id]?.maxSponsors ?? "",
      drafts[p.id]?.reservedSponsors ?? "",
    ) !== null ||
    packageGroupError(p) !== null;

  const dirtyGroupIds = groups
    .filter((g) => isGroupDirty(g, groupDrafts[g.id]))
    .map((g) => g.id);
  const dirtyIds = packages
    .filter((p) => isDirty(p, drafts[p.id]))
    .map((p) => p.id);
  const dirtyTierIds = tiers
    .filter((t) => isTierDirty(t, tierDrafts[t.id]))
    .map((t) => t.id);
  const dirty =
    dirtyIds.length > 0 || dirtyGroupIds.length > 0 || dirtyTierIds.length > 0;
  const anyInvalid =
    groups.some((g) => groupError(g) !== null) ||
    packages.some((p) => packageInvalid(p)) ||
    tiers.some(
      (t) => tierLabelRowError(t) !== null || tierThresholdRowError(t) !== null,
    );
  const modifiedParts = [
    dirtyGroupIds.length > 0
      ? `${dirtyGroupIds.length} group${dirtyGroupIds.length === 1 ? "" : "s"}`
      : null,
    dirtyIds.length > 0
      ? `${dirtyIds.length} package${dirtyIds.length === 1 ? "" : "s"}`
      : null,
    dirtyTierIds.length > 0
      ? `${dirtyTierIds.length} tier${dirtyTierIds.length === 1 ? "" : "s"}`
      : null,
  ].filter((part): part is string => part !== null);

  // Mirrors the create guards: deletes are immediate server mutations, so
  // they are blocked while drafts are dirty or another form/request is active.
  const deleteBlocked =
    dirty ||
    saving ||
    creatingGroup ||
    creatingPackage ||
    creatingTier ||
    deletingItem ||
    showAddGroup ||
    showAddPackageGroupId !== null ||
    showAddTier;
  const deleteBlockedHint = dirty
    ? "Save or reset changes before deleting."
    : showAddGroup || showAddPackageGroupId !== null || showAddTier
      ? "Finish or cancel the create form first."
      : null;
  const dragDisabled =
    saving ||
    creatingGroup ||
    creatingPackage ||
    creatingTier ||
    deletingItem ||
    confirmDelete !== null;

  // --- draft mutators ------------------------------------------------------

  const setDraft = (id: string, patch: Partial<PackageDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const setGroupDraft = (id: string, patch: Partial<GroupDraft>) => {
    setGroupDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const setTierDraft = (id: string, patch: Partial<TierDraft>) => {
    setTierDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  /** Swap the draft displayOrder of this group with its visible neighbor. */
  const moveGroup = (id: string, dir: -1 | 1) => {
    const idx = sortedGroups.findIndex((g) => g.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= sortedGroups.length) return;
    const a = sortedGroups[idx];
    const b = sortedGroups[target];
    setGroupDrafts((prev) => ({
      ...prev,
      [a.id]: { ...prev[a.id], displayOrder: prev[b.id].displayOrder },
      [b.id]: { ...prev[b.id], displayOrder: prev[a.id].displayOrder },
    }));
  };

  function reset() {
    setDrafts(toPackageDrafts(packages));
    setGroupDrafts(toGroupDrafts(groups));
    setTierDrafts(toTierDrafts(tiers));
    setSaveError(null);
    setConfirmDelete(null);
    setDeleteError(null);
  }

  /**
   * Apply a refreshed response from any sponsor mutation endpoint.
   *
   * `keepDrafts` preserves the edits on one side of a partial save failure:
   * packages and tiers save through separate endpoints, so when one succeeds
   * and the other is rejected, resetting every draft would silently discard
   * the rejected edits the admin still needs to correct.
   */
  function applyData(
    data: SponsorPackagesResponse,
    keepDrafts?: { packages?: boolean; tiers?: boolean },
  ) {
    setPackages(data.packages ?? []);
    setGroups(data.groups ?? []);
    setTiers(data.tiers ?? []);
    if (!keepDrafts?.packages) {
      setDrafts(toPackageDrafts(data.packages ?? []));
      setGroupDrafts(toGroupDrafts(data.groups ?? []));
    }
    if (!keepDrafts?.tiers) {
      setTierDrafts(toTierDrafts(data.tiers ?? []));
    }
  }

  // --- delete (inline confirm; no window.confirm) --------------------------

  function requestDelete(target: DeleteTarget) {
    setDeleteError(null);
    setConfirmDelete(target);
  }

  function cancelDelete() {
    setConfirmDelete(null);
    setDeleteError(null);
  }

  async function performDelete() {
    if (!confirmDelete || deletingItem) return;
    if (dirty || saving || creatingGroup || creatingPackage || creatingTier)
      return;
    setDeletingItem(true);
    setDeleteError(null);
    try {
      const data =
        confirmDelete.kind === "package"
          ? await deleteSponsorPackage(COMMUNITY_DAY_EVENT_SLUG, confirmDelete.id)
          : confirmDelete.kind === "group"
            ? await deleteSponsorPackageGroup(
                COMMUNITY_DAY_EVENT_SLUG,
                confirmDelete.id,
              )
            : await deleteSponsorTier(COMMUNITY_DAY_EVENT_SLUG, confirmDelete.id);
      applyData(data);
      setSaveError(null);
      setConfirmDelete(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeletingItem(false);
    }
  }

  // --- drag to reassign group (pointer enhancement; Select stays a11y) -----

  function handleDragStart(id: string, e: ReactDragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id); // required by Firefox
    setDragPackageId(id);
  }

  function handleDragEnd() {
    setDragPackageId(null);
    setDropTargetGroupId(null);
  }

  function handleGroupDragOver(groupId: string, e: ReactDragEvent) {
    if (!dragPackageId) return;
    if ((drafts[dragPackageId]?.groupId ?? "") === groupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetGroupId(groupId);
  }

  function handleGroupDragLeave(groupId: string, e: ReactDragEvent) {
    if (dropTargetGroupId !== groupId) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropTargetGroupId(null);
    }
  }

  function handleGroupDrop(groupId: string, e: ReactDragEvent) {
    e.preventDefault();
    if (dragPackageId && (drafts[dragPackageId]?.groupId ?? "") !== groupId) {
      setDraft(dragPackageId, { groupId });
    }
    handleDragEnd();
  }

  function toggleAddGroup(open: boolean) {
    setShowAddGroup(open);
    setNewGroupLabel("");
    setCreateGroupError(null);
  }

  async function createGroup() {
    if (newGroupLabelError || creatingGroup || dirty) return;
    if (
      showAddPackageGroupId !== null ||
      creatingPackage ||
      showAddTier ||
      creatingTier
    )
      return;
    setCreatingGroup(true);
    setCreateGroupError(null);
    try {
      const data = await createSponsorPackageGroup(
        COMMUNITY_DAY_EVENT_SLUG,
        { label: newGroupLabel.trim() },
      );
      applyData(data);
      setSaveError(null);
      setConfirmDelete(null);
      setDeleteError(null);
      toggleAddGroup(false);
    } catch (e: unknown) {
      setCreateGroupError(
        e instanceof Error ? e.message : "Failed to create group.",
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  function toggleAddPackage(open: boolean, groupId?: string) {
    setShowAddPackageGroupId(open ? (groupId ?? null) : null);
    setNewPackage({ name: "", advantage: "", price: "" });
    setCreatePackageError(null);
  }

  async function createPackage() {
    const groupId = showAddPackageGroupId;
    if (!groupId || !newPackageErrors || creatingPackage || dirty) return;
    if (showAddGroup || creatingGroup || showAddTier || creatingTier) return;
    const priceIdr = parsePriceIdr(newPackage.price);
    if (priceIdr === null) return; // guarded by the disabled Create button
    setCreatingPackage(true);
    setCreatePackageError(null);
    try {
      const data = await createSponsorPackage(COMMUNITY_DAY_EVENT_SLUG, {
        name: newPackage.name.trim(),
        advantage: newPackage.advantage.trim(),
        groupId,
        priceIdr,
      });
      applyData(data);
      setSaveError(null);
      setConfirmDelete(null);
      setDeleteError(null);
      toggleAddPackage(false);
    } catch (e: unknown) {
      setCreatePackageError(
        e instanceof Error ? e.message : "Failed to create package.",
      );
    } finally {
      setCreatingPackage(false);
    }
  }

  function toggleAddTier(open: boolean) {
    setShowAddTier(open);
    setNewTier({ label: "", threshold: "", accent: "default" });
    setCreateTierError(null);
  }

  async function createTier() {
    if (!newTierErrors || creatingTier || dirty || tiers.length >= MAX_TIERS)
      return;
    if (showAddGroup || creatingGroup || showAddPackageGroupId !== null || creatingPackage)
      return;
    const thresholdIdr = parsePriceIdr(newTier.threshold);
    if (thresholdIdr === null) return; // guarded by the disabled Create button
    setCreatingTier(true);
    setCreateTierError(null);
    try {
      const data = await createSponsorTier(COMMUNITY_DAY_EVENT_SLUG, {
        label: newTier.label.trim(),
        thresholdIdr,
        accent: newTier.accent,
      });
      applyData(data);
      setSaveError(null);
      setConfirmDelete(null);
      setDeleteError(null);
      toggleAddTier(false);
    } catch (e: unknown) {
      setCreateTierError(
        e instanceof Error ? e.message : "Failed to create tier.",
      );
    } finally {
      setCreatingTier(false);
    }
  }

  async function save() {
    const groupUpdates: SponsorPackageGroupUpdate[] = dirtyGroupIds.map(
      (id) => ({
        id,
        label: (groupDrafts[id]?.label ?? "").trim(),
        displayOrder: groupDrafts[id]?.displayOrder ?? 0,
      }),
    );

    const packageUpdates: SponsorPackageUpdate[] = [];
    for (const id of dirtyIds) {
      const priceIdr = parsePriceIdr(drafts[id].price);
      if (priceIdr === null) return; // guarded by the disabled Save button
      if (minimumSpendError(drafts[id].minSpend) !== null) return;
      if (maxSponsorsError(drafts[id].maxSponsors) !== null) return;
      if (
        reservedSponsorsError(drafts[id].maxSponsors, drafts[id].reservedSponsors) !==
        null
      )
        return; // guarded by the disabled Save button
      packageUpdates.push({
        id,
        groupId: drafts[id].groupId,
        priceIdr,
        minimumSpendIdr: parseMinimumSpendIdr(drafts[id].minSpend),
        maxSponsors: parseMaxSponsors(drafts[id].maxSponsors),
        reservedSponsors: parseReservedSponsors(drafts[id].reservedSponsors),
        isUnlocked: drafts[id].isUnlocked,
      });
    }

    const tierUpdates: SponsorTierUpdate[] = [];
    for (const id of dirtyTierIds) {
      const thresholdIdr = parsePriceIdr(tierDrafts[id]?.threshold ?? "");
      if (thresholdIdr === null) return; // guarded by the disabled Save button
      tierUpdates.push({
        id,
        label: (tierDrafts[id]?.label ?? "").trim(),
        thresholdIdr,
        accent: tierDrafts[id]?.accent ?? "default",
      });
    }

    if (
      groupUpdates.length === 0 &&
      packageUpdates.length === 0 &&
      tierUpdates.length === 0
    )
      return;

    setSaving(true);
    setSaveError(null);
    try {
      // Tiers live on a separate endpoint from the packages/groups batch;
      // call whichever is dirty and surface whichever errors occur.
      const failures: string[] = [];
      let refreshed: SponsorPackagesResponse | null = null;
      let packagesFailed = false;
      let tiersFailed = false;
      if (groupUpdates.length > 0 || packageUpdates.length > 0) {
        try {
          refreshed = await updateAdminSponsorPackages(
            COMMUNITY_DAY_EVENT_SLUG,
            { groups: groupUpdates, packages: packageUpdates },
          );
        } catch (e: unknown) {
          packagesFailed = true;
          failures.push(
            e instanceof Error ? e.message : "Failed to save package changes.",
          );
        }
      }
      if (tierUpdates.length > 0) {
        try {
          refreshed = await updateSponsorTiers(COMMUNITY_DAY_EVENT_SLUG, {
            tiers: tierUpdates,
          });
        } catch (e: unknown) {
          tiersFailed = true;
          failures.push(
            e instanceof Error ? e.message : "Failed to save tier changes.",
          );
        }
      }
      if (refreshed) {
        applyData(refreshed, {
          packages: packagesFailed,
          tiers: tiersFailed,
        });
      }
      if (failures.length > 0) setSaveError(failures.join(" "));
    } finally {
      setSaving(false);
    }
  }

  // --- render helpers ------------------------------------------------------

  const renderRow = (p: SponsorPackage) => {
    const draft = drafts[p.id];
    if (!draft) return null;
    return (
      <PackageRow
        key={p.id}
        pkg={p}
        draft={draft}
        dirty={isDirty(p, draft)}
        error={priceError(draft.price)}
        minSpendError={minimumSpendError(draft.minSpend)}
        maxError={maxSponsorsError(draft.maxSponsors)}
        reservedError={reservedSponsorsError(draft.maxSponsors, draft.reservedSponsors)}
        groupError={packageGroupError(p)}
        groupOptions={sortedGroups.map((g) => ({
          id: g.id,
          label: (groupDrafts[g.id]?.label ?? g.label).trim() || g.id,
        }))}
        disabled={saving || creatingGroup || creatingPackage || creatingTier}
        onChange={(patch) => setDraft(p.id, patch)}
        deleteControl={
          <DeleteAction
            label={`package ${p.name}`}
            disabled={deleteBlocked}
            hint={deleteBlockedHint}
            confirming={
              confirmDelete?.kind === "package" && confirmDelete.id === p.id
            }
            busy={deletingItem}
            error={
              confirmDelete?.kind === "package" && confirmDelete.id === p.id
                ? deleteError
                : null
            }
            onRequest={() =>
              requestDelete({ kind: "package", id: p.id, name: p.name })
            }
            onConfirm={performDelete}
            onCancel={cancelDelete}
          />
        }
        dragDisabled={dragDisabled}
        isDragging={dragPackageId === p.id}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card border border-border/80 rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading sponsor packages…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={load} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const orphaned = packages.filter(
    (p) => !groupIdSet.has(drafts[p.id]?.groupId ?? p.groupId ?? ""),
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/80">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg">Community Day packages</CardTitle>
              <CardDescription>
                Group sponsor packages, edit group labels and ordering, and
                adjust IDR prices, availability, minimum-spend requirements,
                and sponsor capacity. Package definitions, order, and
                descriptions are read-only.
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                Drag a package onto another group to reassign it, or use its
                Group selector — either way the move is saved with Save
                changes.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => toggleAddGroup(true)}
                disabled={
                  dirty ||
                  saving ||
                  creatingGroup ||
                  creatingPackage ||
                  creatingTier ||
                  showAddPackageGroupId !== null ||
                  showAddTier
                }
              >
                <Plus className="h-4 w-4" />
                Add group
              </Button>
              {dirty &&
                !showAddGroup &&
                showAddPackageGroupId === null &&
                !showAddTier && (
                  <p className="text-xs text-muted-foreground">
                    Save or reset changes before adding a group.
                  </p>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddGroup && (
            <form
              className="rounded-xl border border-border/60 bg-background/40 p-3 sm:p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createGroup();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-group-label">New group label</Label>
                <Input
                  id="new-group-label"
                  type="text"
                  autoComplete="off"
                  className="bg-background"
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                  disabled={creatingGroup}
                  aria-invalid={newGroupLabelError ? true : undefined}
                  aria-describedby="new-group-label-error"
                />
                {newGroupLabelError ?? createGroupError ? (
                  <p
                    id="new-group-label-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {newGroupLabelError ?? createGroupError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    1–80 characters; must be unique among groups.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="flex items-center gap-1.5"
                  disabled={
                    creatingGroup || dirty || newGroupLabelError !== null
                  }
                >
                  {creatingGroup ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAddGroup(false)}
                  disabled={creatingGroup}
                >
                  Cancel
                </Button>
                {dirty && (
                  <p className="text-xs text-muted-foreground">
                    Save or reset changes before creating a group.
                  </p>
                )}
              </div>
            </form>
          )}
          {groups.length === 0 && packages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No sponsor packages configured for this event.
            </p>
          ) : (
            sortedGroups.map((g, i) => {
              const rows = packages
                .filter((p) => (drafts[p.id]?.groupId ?? p.groupId) === g.id)
                .sort(
                  (a, b) =>
                    a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
                );
              const groupLabel =
                (groupDrafts[g.id]?.label ?? g.label).trim() || g.id;
              return (
                <GroupSection
                  key={g.id}
                  group={g}
                  draft={groupDrafts[g.id]}
                  dirty={isGroupDirty(g, groupDrafts[g.id])}
                  error={groupError(g)}
                  canMoveUp={i > 0}
                  canMoveDown={i < sortedGroups.length - 1}
                  disabled={saving || creatingGroup || creatingPackage || creatingTier}
                  onLabelChange={(label) => setGroupDraft(g.id, { label })}
                  onMove={(dir) => moveGroup(g.id, dir)}
                  onAddPackage={() => toggleAddPackage(true, g.id)}
                  canAddPackage={
                    !dirty &&
                    !saving &&
                    !creatingGroup &&
                    !creatingPackage &&
                    !creatingTier &&
                    !showAddGroup &&
                    !showAddTier &&
                    showAddPackageGroupId === null
                  }
                  addPackageHint={
                    dirty ? "Save or reset changes before adding a package." : null
                  }
                  deleteControl={
                    <DeleteAction
                      label={`group ${groupLabel}`}
                      disabled={deleteBlocked || rows.length > 0}
                      hint={
                        rows.length > 0
                          ? `Move or delete its ${rows.length} package${rows.length === 1 ? "" : "s"} first.`
                          : deleteBlockedHint
                      }
                      confirming={
                        confirmDelete?.kind === "group" && confirmDelete.id === g.id
                      }
                      busy={deletingItem}
                      error={
                        confirmDelete?.kind === "group" && confirmDelete.id === g.id
                          ? deleteError
                          : null
                      }
                      onRequest={() =>
                        requestDelete({ kind: "group", id: g.id, name: groupLabel })
                      }
                      onConfirm={performDelete}
                      onCancel={cancelDelete}
                    />
                  }
                  isDropTarget={dropTargetGroupId === g.id}
                  onDragOver={(e) => handleGroupDragOver(g.id, e)}
                  onDragLeave={(e) => handleGroupDragLeave(g.id, e)}
                  onDrop={(e) => handleGroupDrop(g.id, e)}
                >
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No packages in this group yet.
                    </p>
                  ) : (
                    rows.map(renderRow)
                  )}
                  {showAddPackageGroupId === g.id && (
                    <AddPackageForm
                      groupId={g.id}
                      groupLabel={groupLabel}
                      value={newPackage}
                      errors={newPackageErrors}
                      serverError={createPackageError}
                      busy={creatingPackage}
                      blocked={dirty || saving}
                      onChange={(patch) =>
                        setNewPackage((prev) => ({ ...prev, ...patch }))
                      }
                      onCancel={() => toggleAddPackage(false)}
                      onSubmit={createPackage}
                    />
                  )}
                </GroupSection>
              );
            })
          )}

          {orphaned.length > 0 && (
            <section className="rounded-xl border border-destructive/40 bg-background/40 p-3 sm:p-4 space-y-3">
              <p className="text-sm text-destructive" role="alert">
                {orphaned.length} package{orphaned.length === 1 ? "" : "s"}{" "}
                reference{orphaned.length === 1 ? "s" : ""} a group that no
                longer exists. Reassign them below.
              </p>
              {orphaned.map(renderRow)}
            </section>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border/80">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg">Sponsorship tiers</CardTitle>
              <CardDescription>
                Event-wide tiers evaluated by total sponsorship amount. A
                sponsorship reaches a tier when its total is at or above that
                tier&apos;s threshold; the highest matching tier wins.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => toggleAddTier(true)}
                disabled={
                  dirty ||
                  saving ||
                  creatingGroup ||
                  creatingPackage ||
                  creatingTier ||
                  showAddGroup ||
                  showAddPackageGroupId !== null ||
                  tiers.length >= MAX_TIERS
                }
              >
                <Plus className="h-4 w-4" />
                Add tier
              </Button>
              {dirty && !showAddTier && (
                <p className="text-xs text-muted-foreground">
                  Save or reset changes before adding a tier.
                </p>
              )}
              {tiers.length >= MAX_TIERS && !showAddTier && (
                <p className="text-xs text-muted-foreground">
                  Maximum of {MAX_TIERS} tiers.
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddTier && (
            <AddTierForm
              value={newTier}
              errors={newTierErrors}
              serverError={createTierError}
              busy={creatingTier}
              blocked={dirty || saving}
              onChange={(patch) => setNewTier((prev) => ({ ...prev, ...patch }))}
              onCancel={() => toggleAddTier(false)}
              onSubmit={createTier}
            />
          )}
          {tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No sponsorship tiers configured for this event.
            </p>
          ) : (
            sortedTiers.map((t) => {
              const draft = tierDrafts[t.id];
              if (!draft) return null;
              const tierLabel = draft.label.trim() || t.label;
              return (
                <TierRow
                  key={t.id}
                  tier={t}
                  draft={draft}
                  dirty={isTierDirty(t, draft)}
                  labelError={tierLabelRowError(t)}
                  thresholdError={tierThresholdRowError(t)}
                  disabled={saving || creatingGroup || creatingPackage || creatingTier}
                  onChange={(patch) => setTierDraft(t.id, patch)}
                  deleteControl={
                    <DeleteAction
                      label={`tier ${tierLabel}`}
                      disabled={deleteBlocked}
                      hint={deleteBlockedHint}
                      confirming={
                        confirmDelete?.kind === "tier" && confirmDelete.id === t.id
                      }
                      busy={deletingItem}
                      error={
                        confirmDelete?.kind === "tier" && confirmDelete.id === t.id
                          ? deleteError
                          : null
                      }
                      onRequest={() =>
                        requestDelete({ kind: "tier", id: t.id, name: t.label })
                      }
                      onConfirm={performDelete}
                      onCancel={cancelDelete}
                    />
                  }
                />
              );
            })
          )}
        </CardContent>
      </Card>

      {(packages.length > 0 || groups.length > 0 || tiers.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4">
          <div>
            <p className="text-sm text-foreground">
              {dirty
                ? `${modifiedParts.join(", ")} modified`
                : "No unsaved changes"}
            </p>
            {saveError && (
              <p role="alert" className="text-sm text-destructive mt-1">
                {saveError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={reset}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={save}
              disabled={!dirty || anyInvalid || saving}
              className="flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupSection
// ---------------------------------------------------------------------------
function GroupSection({
  group,
  draft,
  dirty,
  error,
  canMoveUp,
  canMoveDown,
  disabled,
  onLabelChange,
  onMove,
  onAddPackage,
  canAddPackage,
  addPackageHint,
  deleteControl,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  group: SponsorPackageGroup;
  draft: GroupDraft | undefined;
  dirty: boolean;
  error: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onLabelChange: (label: string) => void;
  onMove: (dir: -1 | 1) => void;
  onAddPackage: () => void;
  canAddPackage: boolean;
  addPackageHint: string | null;
  deleteControl: ReactNode;
  isDropTarget: boolean;
  onDragOver: (e: ReactDragEvent) => void;
  onDragLeave: (e: ReactDragEvent) => void;
  onDrop: (e: ReactDragEvent) => void;
  children: ReactNode;
}) {
  const labelId = `group-label-${group.id}`;
  const errorId = `${labelId}-error`;
  const label = draft?.label ?? "";

  return (
    <section
      className={`rounded-xl border p-3 sm:p-4 space-y-3 transition-colors ${
        isDropTarget
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border/60 bg-background/40"
      }`}
      aria-labelledby={labelId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={labelId}>Group label</Label>
            {dirty && (
              <span className="text-xs text-muted-foreground">Modified</span>
            )}
          </div>
          <Input
            id={labelId}
            type="text"
            autoComplete="off"
            className="bg-background"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground font-mono truncate">
              {group.id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:pt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={onAddPackage}
            disabled={!canAddPackage}
          >
            <Plus className="h-4 w-4" />
            Add package
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={`Move group ${label || group.id} up`}
            onClick={() => onMove(-1)}
            disabled={disabled || !canMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={`Move group ${label || group.id} down`}
            onClick={() => onMove(1)}
            disabled={disabled || !canMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!canAddPackage && addPackageHint && (
        <p className="text-xs text-muted-foreground">{addPackageHint}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">{deleteControl}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PackageRow
// ---------------------------------------------------------------------------
function PackageRow({
  pkg,
  draft,
  dirty,
  error,
  minSpendError,
  maxError,
  reservedError,
  groupError,
  groupOptions,
  disabled,
  onChange,
  deleteControl,
  dragDisabled,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  pkg: SponsorPackage;
  draft: PackageDraft;
  dirty: boolean;
  error: string | null;
  minSpendError: string | null;
  maxError: string | null;
  reservedError: string | null;
  groupError: string | null;
  groupOptions: { id: string; label: string }[];
  disabled: boolean;
  onChange: (patch: Partial<PackageDraft>) => void;
  deleteControl: ReactNode;
  dragDisabled: boolean;
  isDragging: boolean;
  onDragStart: (id: string, e: ReactDragEvent) => void;
  onDragEnd: () => void;
}) {
  const priceId = `pkg-price-${pkg.id}`;
  const priceErrorId = `${priceId}-error`;
  const minSpendId = `pkg-minspend-${pkg.id}`;
  const minSpendErrorId = `${minSpendId}-error`;
  const maxId = `pkg-max-${pkg.id}`;
  const maxErrorId = `${maxId}-error`;
  const reservedId = `pkg-reserved-${pkg.id}`;
  const reservedErrorId = `${reservedId}-error`;
  const unlockId = `pkg-unlocked-${pkg.id}`;
  const groupId = `pkg-group-${pkg.id}`;
  const groupErrorId = `${groupId}-error`;
  const parsed = parsePriceIdr(draft.price);
  const parsedMinSpend = parseMinimumSpendIdr(draft.minSpend);
  const parsedMax = parseMaxSponsors(draft.maxSponsors);
  const parsedReserved = parseReservedSponsors(draft.reservedSponsors);

  return (
    <div
      className={`rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          draggable={!dragDisabled}
          onDragStart={(e) => onDragStart(pkg.id, e)}
          onDragEnd={onDragEnd}
          title="Drag to another group"
          className={`inline-flex shrink-0 touch-none ${
            dragDisabled
              ? "cursor-not-allowed opacity-40"
              : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="font-medium text-foreground">{pkg.name}</span>
        <Badge variant="outline" className="capitalize">
          {pkg.category}
        </Badge>
        <Badge variant={draft.isUnlocked ? "secondary" : "outline"}>
          {draft.isUnlocked ? "Available" : "Unavailable"}
        </Badge>
        {parsedMinSpend !== null && (
          <Badge variant="outline">Min spend {formatIDR(parsedMinSpend)}</Badge>
        )}
        {parsedMax === null ? (
          <Badge variant="outline">Unlimited</Badge>
        ) : parsedReserved >= parsedMax ? (
          <Badge variant="destructive">Sold out</Badge>
        ) : (
          <Badge variant="outline">
            {parsedReserved}/{parsedMax} reserved
          </Badge>
        )}
        {dirty && (
          <span className="text-xs text-muted-foreground">Modified</span>
        )}
        <div className="ml-auto">{deleteControl}</div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{pkg.advantage}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={groupId}>Group</Label>
          <Select
            value={draft.groupId}
            onValueChange={(v) => onChange({ groupId: v })}
            disabled={disabled}
          >
            <SelectTrigger
              id={groupId}
              className="bg-background"
              aria-invalid={groupError ? true : undefined}
              aria-describedby={groupError ? groupErrorId : undefined}
            >
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {groupOptions.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {groupError ? (
            <p id={groupErrorId} className="text-xs text-destructive">
              {groupError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Move this package to another group.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={priceId}>Price (IDR)</Label>
          <Input
            id={priceId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="bg-background"
            value={draft.price}
            onChange={(e) => onChange({ price: e.target.value })}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? priceErrorId : undefined}
          />
          {error ? (
            <p id={priceErrorId} className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            parsed !== null && (
              <p className="text-xs text-muted-foreground">
                {formatIDR(parsed)}
              </p>
            )
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={minSpendId}>Minimum spend to unlock (IDR)</Label>
          <Input
            id={minSpendId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="No requirement"
            className="bg-background"
            value={draft.minSpend}
            onChange={(e) => onChange({ minSpend: e.target.value })}
            disabled={disabled}
            aria-invalid={minSpendError ? true : undefined}
            aria-describedby={minSpendError ? minSpendErrorId : undefined}
          />
          {minSpendError ? (
            <p id={minSpendErrorId} className="text-xs text-destructive">
              {minSpendError}
            </p>
          ) : parsedMinSpend !== null ? (
            <p className="text-xs text-muted-foreground">
              Unlocks at {formatIDR(parsedMinSpend)} total spend
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Optional — empty means no spend requirement.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={maxId}>Maximum sponsors</Label>
          <Input
            id={maxId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="Unlimited"
            className="bg-background"
            value={draft.maxSponsors}
            onChange={(e) => onChange({ maxSponsors: e.target.value })}
            disabled={disabled}
            aria-invalid={maxError ? true : undefined}
            aria-describedby={maxError ? maxErrorId : undefined}
          />
          {maxError ? (
            <p id={maxErrorId} className="text-xs text-destructive">
              {maxError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {parsedMax !== null
                ? `${parsedMax} sponsor slots`
                : "Optional — empty means unlimited."}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={reservedId}>Reserved sponsors</Label>
          <Input
            id={reservedId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="bg-background"
            value={draft.reservedSponsors}
            onChange={(e) => onChange({ reservedSponsors: e.target.value })}
            disabled={disabled}
            aria-invalid={reservedError ? true : undefined}
            aria-describedby={reservedError ? reservedErrorId : undefined}
          />
          {reservedError ? (
            <p id={reservedErrorId} className="text-xs text-destructive">
              {reservedError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Manually maintained — sponsor requests are not reservations.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium leading-none block">Availability</span>
          <div className="flex items-center gap-2 h-9">
            <Checkbox
              id={unlockId}
              checked={draft.isUnlocked}
              onCheckedChange={(v) => onChange({ isUnlocked: v === true })}
              disabled={disabled}
            />
            <Label htmlFor={unlockId} className="font-normal">
              Enabled
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {draft.isUnlocked
              ? parsedMinSpend !== null
                ? `Selectable once total spend reaches ${formatIDR(parsedMinSpend)}.`
                : "Selectable on the public sponsor page."
              : "Visible but not selectable on the public sponsor page."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeleteAction — two-step inline confirm (no window.confirm)
// ---------------------------------------------------------------------------
function DeleteAction({
  label,
  disabled,
  hint,
  confirming,
  busy,
  error,
  onRequest,
  onConfirm,
  onCancel,
}: {
  /** e.g. "package Gold" — used in the aria-label and confirm prompt. */
  label: string;
  disabled: boolean;
  hint: string | null;
  confirming: boolean;
  busy: boolean;
  error: string | null;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
          aria-label={`Delete ${label}`}
          onClick={onRequest}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        {disabled && hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`Delete ${label}`}
    >
      <span className="text-sm font-medium text-destructive">
        Delete {label}?
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onConfirm}
        disabled={busy || disabled}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Confirm
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={busy}
      >
        Cancel
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddPackageForm — inline create form nested inside a group section
// ---------------------------------------------------------------------------
interface NewPackageInput {
  name: string;
  advantage: string;
  price: string;
}

interface PackageFormErrors {
  name: string | null;
  advantage: string | null;
  price: string | null;
}

function AddPackageForm({
  groupId,
  groupLabel,
  value,
  errors,
  serverError,
  busy,
  blocked,
  onChange,
  onCancel,
  onSubmit,
}: {
  groupId: string;
  groupLabel: string;
  value: NewPackageInput;
  errors: PackageFormErrors | null;
  serverError: string | null;
  busy: boolean;
  /** True when existing drafts are dirty or a save is in flight. */
  blocked: boolean;
  onChange: (patch: Partial<NewPackageInput>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const nameId = `new-pkg-name-${groupId}`;
  const nameErrorId = `${nameId}-error`;
  const advantageId = `new-pkg-advantage-${groupId}`;
  const advantageErrorId = `${advantageId}-error`;
  const priceId = `new-pkg-price-${groupId}`;
  const priceErrorId = `${priceId}-error`;
  const formErrorId = `new-pkg-error-${groupId}`;
  const headingId = `new-pkg-heading-${groupId}`;
  const parsedPrice = parsePriceIdr(value.price);
  const invalid =
    errors !== null &&
    (errors.name !== null || errors.advantage !== null || errors.price !== null);
  const createDisabled = busy || blocked || invalid;

  return (
    <form
      aria-labelledby={headingId}
      className="rounded-xl border border-border/60 bg-background/40 p-3 sm:p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p id={headingId} className="text-sm font-medium text-foreground">
        New package in “{groupLabel}”
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={nameId}>Package name</Label>
          <Input
            id={nameId}
            type="text"
            autoComplete="off"
            maxLength={MAX_PACKAGE_NAME}
            className="bg-background"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={busy}
            aria-invalid={errors?.name ? true : undefined}
            aria-describedby={errors?.name ? nameErrorId : undefined}
          />
          {errors?.name ? (
            <p id={nameErrorId} className="text-xs text-destructive">
              {errors.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              1–80 characters; must be unique among packages.
            </p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={advantageId}>Benefit / description</Label>
          <Textarea
            id={advantageId}
            rows={3}
            autoComplete="off"
            maxLength={MAX_ADVANTAGE}
            className="bg-background resize-y"
            value={value.advantage}
            onChange={(e) => onChange({ advantage: e.target.value })}
            disabled={busy}
            aria-invalid={errors?.advantage ? true : undefined}
            aria-describedby={errors?.advantage ? advantageErrorId : undefined}
          />
          {errors?.advantage ? (
            <p id={advantageErrorId} className="text-xs text-destructive">
              {errors.advantage}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              1–500 characters.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={priceId}>Price (IDR)</Label>
          <Input
            id={priceId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="bg-background"
            value={value.price}
            onChange={(e) => onChange({ price: e.target.value })}
            disabled={busy}
            aria-invalid={errors?.price ? true : undefined}
            aria-describedby={errors?.price ? priceErrorId : undefined}
          />
          {errors?.price ? (
            <p id={priceErrorId} className="text-xs text-destructive">
              {errors.price}
            </p>
          ) : (
            parsedPrice !== null && (
              <p className="text-xs text-muted-foreground">
                {formatIDR(parsedPrice)}
              </p>
            )
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          className="flex items-center gap-1.5"
          disabled={createDisabled}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        {blocked && (
          <p className="text-xs text-muted-foreground">
            Save or reset changes before creating a package.
          </p>
        )}
        {serverError && (
          <p id={formErrorId} role="alert" className="text-xs text-destructive">
            {serverError}
          </p>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// TierRow — editable sponsorship tier (label / threshold / accent)
// ---------------------------------------------------------------------------
function TierRow({
  tier,
  draft,
  dirty,
  labelError,
  thresholdError,
  disabled,
  onChange,
  deleteControl,
}: {
  tier: SponsorTier;
  draft: TierDraft;
  dirty: boolean;
  labelError: string | null;
  thresholdError: string | null;
  disabled: boolean;
  onChange: (patch: Partial<TierDraft>) => void;
  deleteControl: ReactNode;
}) {
  const labelId = `tier-label-${tier.id}`;
  const labelErrorId = `${labelId}-error`;
  const thresholdId = `tier-threshold-${tier.id}`;
  const thresholdErrorId = `${thresholdId}-error`;
  const accentId = `tier-accent-${tier.id}`;
  const parsedThreshold = parsePriceIdr(draft.threshold);

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {draft.accent}
        </Badge>
        {dirty && (
          <span className="text-xs text-muted-foreground">Modified</span>
        )}
        <div className="ml-auto">{deleteControl}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={labelId}>Label</Label>
          <Input
            id={labelId}
            type="text"
            autoComplete="off"
            maxLength={MAX_TIER_LABEL}
            className="bg-background"
            value={draft.label}
            onChange={(e) => onChange({ label: e.target.value })}
            disabled={disabled}
            aria-invalid={labelError ? true : undefined}
            aria-describedby={labelError ? labelErrorId : undefined}
          />
          {labelError ? (
            <p id={labelErrorId} className="text-xs text-destructive">
              {labelError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground font-mono truncate">
              {tier.id}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={thresholdId}>Threshold (IDR)</Label>
          <Input
            id={thresholdId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="bg-background"
            value={draft.threshold}
            onChange={(e) => onChange({ threshold: e.target.value })}
            disabled={disabled}
            aria-invalid={thresholdError ? true : undefined}
            aria-describedby={thresholdError ? thresholdErrorId : undefined}
          />
          {thresholdError ? (
            <p id={thresholdErrorId} className="text-xs text-destructive">
              {thresholdError}
            </p>
          ) : (
            parsedThreshold !== null && (
              <p className="text-xs text-muted-foreground">
                Reaches this tier at {formatIDR(parsedThreshold)} or more
              </p>
            )
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={accentId}>Accent</Label>
          <Select
            value={draft.accent}
            onValueChange={(v) => onChange({ accent: v as SponsorTierAccent })}
            disabled={disabled}
          >
            <SelectTrigger id={accentId} className="bg-background">
              <SelectValue placeholder="Select an accent" />
            </SelectTrigger>
            <SelectContent>
              {TIER_ACCENTS.map((a) => (
                <SelectItem key={a} value={a}>
                  <span className="capitalize">{a}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Badge color used on the public sponsor page.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddTierForm — inline create form for a new sponsorship tier
// ---------------------------------------------------------------------------
interface NewTierInput {
  label: string;
  threshold: string;
  accent: SponsorTierAccent;
}

interface TierFormErrors {
  label: string | null;
  threshold: string | null;
}

function AddTierForm({
  value,
  errors,
  serverError,
  busy,
  blocked,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: NewTierInput;
  errors: TierFormErrors | null;
  serverError: string | null;
  busy: boolean;
  /** True when existing drafts are dirty or a save is in flight. */
  blocked: boolean;
  onChange: (patch: Partial<NewTierInput>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const labelId = "new-tier-label";
  const labelErrorId = `${labelId}-error`;
  const thresholdId = "new-tier-threshold";
  const thresholdErrorId = `${thresholdId}-error`;
  const accentId = "new-tier-accent";
  const formErrorId = "new-tier-error";
  const headingId = "new-tier-heading";
  const parsedThreshold = parsePriceIdr(value.threshold);
  const invalid =
    errors !== null && (errors.label !== null || errors.threshold !== null);
  const createDisabled = busy || blocked || invalid;

  return (
    <form
      aria-labelledby={headingId}
      className="rounded-xl border border-border/60 bg-background/40 p-3 sm:p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p id={headingId} className="text-sm font-medium text-foreground">
        New sponsorship tier
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={labelId}>Tier label</Label>
          <Input
            id={labelId}
            type="text"
            autoComplete="off"
            maxLength={MAX_TIER_LABEL}
            className="bg-background"
            value={value.label}
            onChange={(e) => onChange({ label: e.target.value })}
            disabled={busy}
            aria-invalid={errors?.label ? true : undefined}
            aria-describedby={errors?.label ? labelErrorId : undefined}
          />
          {errors?.label ? (
            <p id={labelErrorId} className="text-xs text-destructive">
              {errors.label}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              1–60 characters; must be unique among tiers.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={thresholdId}>Threshold (IDR)</Label>
          <Input
            id={thresholdId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="bg-background"
            value={value.threshold}
            onChange={(e) => onChange({ threshold: e.target.value })}
            disabled={busy}
            aria-invalid={errors?.threshold ? true : undefined}
            aria-describedby={errors?.threshold ? thresholdErrorId : undefined}
          />
          {errors?.threshold ? (
            <p id={thresholdErrorId} className="text-xs text-destructive">
              {errors.threshold}
            </p>
          ) : (
            parsedThreshold !== null && (
              <p className="text-xs text-muted-foreground">
                {formatIDR(parsedThreshold)}
              </p>
            )
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={accentId}>Accent</Label>
          <Select
            value={value.accent}
            onValueChange={(v) => onChange({ accent: v as SponsorTierAccent })}
            disabled={busy}
          >
            <SelectTrigger id={accentId} className="bg-background">
              <SelectValue placeholder="Select an accent" />
            </SelectTrigger>
            <SelectContent>
              {TIER_ACCENTS.map((a) => (
                <SelectItem key={a} value={a}>
                  <span className="capitalize">{a}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Badge color used on the public sponsor page.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          className="flex items-center gap-1.5"
          disabled={createDisabled}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        {blocked && (
          <p className="text-xs text-muted-foreground">
            Save or reset changes before creating a tier.
          </p>
        )}
        {serverError && (
          <p id={formErrorId} role="alert" className="text-xs text-destructive">
            {serverError}
          </p>
        )}
      </div>
    </form>
  );
}

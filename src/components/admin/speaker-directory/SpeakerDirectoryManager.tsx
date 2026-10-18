"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Mic,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Calendar,
  Sparkles,
  Layers,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchAdminSpeakers,
  createAdminSpeaker,
  updateAdminSpeaker,
  deleteAdminSpeaker,
  reorderAdminSpeakers,
} from "@/lib/api";
import type {
  EventSpeaker,
  EventSpeakerCreate,
  EventSpeakerUpdate,
  EventSpeakerOrderItem,
} from "@/lib/types";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

export type EventCategoryType = "Conference" | "Monthly Meetup" | "Workshop" | "Other";

export interface EventOption {
  slug: string;
  name: string;
  category: EventCategoryType;
  badge?: string;
}

export const KNOWN_EVENTS: EventOption[] = [
  // Conferences
  {
    slug: "community-day-2026",
    name: "AWS Community Day Jakarta 2026",
    category: "Conference",
    badge: "Oct 2026",
  },
  {
    slug: "community-day-2025",
    name: "AWS Community Day Jakarta 2025",
    category: "Conference",
    badge: "Past",
  },
  {
    slug: "reinvent-recap-2025",
    name: "AWS re:Invent 2025 Recap",
    category: "Conference",
  },

  // Monthly Meetups
  {
    slug: "monthly-meetup",
    name: "Monthly Meetup (Global / General)",
    category: "Monthly Meetup",
    badge: "Global",
  },
  {
    slug: "aws-ug-jakarta-redis-october-2026",
    name: "October 2026 Meetup (with Redis)",
    category: "Monthly Meetup",
    badge: "Oct 2026",
  },
  {
    slug: "monthly-meetup-july-2026",
    name: "July 2026 Meetup",
    category: "Monthly Meetup",
    badge: "Jul 2026",
  },
  {
    slug: "monthly-meetup-june-2026",
    name: "June 2026 Meetup",
    category: "Monthly Meetup",
    badge: "Jun 2026",
  },
  {
    slug: "monthly-meetup-april-2026",
    name: "April 2026 Meetup",
    category: "Monthly Meetup",
    badge: "Apr 2026",
  },
  {
    slug: "kiro-night-bukber",
    name: "Kiro Night Meetup",
    category: "Monthly Meetup",
  },

  // Workshops
  {
    slug: "voice-ai-agents-workshop-may-2026",
    name: "Voice AI Agents Workshop",
    category: "Workshop",
    badge: "May 2026",
  },
];

export function getEventCategoryMeta(slug: string): { label: string; category: EventCategoryType; color: string } {
  const found = KNOWN_EVENTS.find((e) => e.slug === slug);
  if (found) {
    if (found.category === "Conference") {
      return { label: found.name, category: "Conference", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" };
    }
    if (found.category === "Monthly Meetup") {
      return { label: found.name, category: "Monthly Meetup", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    }
    if (found.category === "Workshop") {
      return { label: found.name, category: "Workshop", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    }
    return { label: found.name, category: "Other", color: "bg-muted text-muted-foreground border-border/50" };
  }
  if (slug.includes("community") || slug.includes("conference") || slug.includes("recap")) {
    return { label: slug, category: "Conference", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" };
  }
  if (slug.includes("monthly") || slug.includes("meetup")) {
    return { label: slug, category: "Monthly Meetup", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
  }
  if (slug.includes("workshop")) {
    return { label: slug, category: "Workshop", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
  }
  return { label: slug, category: "Other", color: "bg-muted text-muted-foreground border-border/50" };
}

interface SpeakerFormData {
  eventSlug: string;
  name: string;
  role: string;
  company: string;
  photoUrl: string;
  topicImageUrl: string;
  talkTitle: string;
  talkFormat: string;
  bio: string;
  socialUrl: string;
  isActive: boolean;
}

const INITIAL_FORM: SpeakerFormData = {
  eventSlug: COMMUNITY_DAY_EVENT_SLUG,
  name: "",
  role: "",
  company: "",
  photoUrl: "",
  topicImageUrl: "",
  talkTitle: "",
  talkFormat: "Keynote",
  bio: "",
  socialUrl: "",
  isActive: true,
};

export function SpeakerDirectoryManager() {
  // Category & Event Filter
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | EventCategoryType>("ALL");
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>("ALL");
  const [customEventInput, setCustomEventInput] = useState<string>("");

  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Form Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<EventSpeaker | null>(null);
  const [formData, setFormData] = useState<SpeakerFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formCustomSlug, setFormCustomSlug] = useState(false);

  // Delete Dialog state
  const [deleteTarget, setDeleteTarget] = useState<EventSpeaker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine active query slug for API
  const activeQuerySlug = selectedEventSlug === "CUSTOM" ? customEventInput.trim() : selectedEventSlug;

  // Load speakers
  const loadSpeakers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminSpeakers(activeQuerySlug === "ALL" ? undefined : activeQuerySlug);
      setSpeakers(res.speakers || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load speakers directory");
    } finally {
      setLoading(false);
    }
  }, [activeQuerySlug]);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  // Filtered events for the dropdown based on selectedCategory tab
  const availableEvents = useMemo(() => {
    if (selectedCategory === "ALL") return KNOWN_EVENTS;
    return KNOWN_EVENTS.filter((e) => e.category === selectedCategory);
  }, [selectedCategory]);

  // Filtered speakers based on Category, Search query, and Status
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((s) => {
      // Category filter (when selectedEventSlug is "ALL")
      if (selectedCategory !== "ALL") {
        const meta = getEventCategoryMeta(s.eventSlug);
        if (meta.category !== selectedCategory) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.talkTitle.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.eventSlug.toLowerCase().includes(q) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.talkFormat && s.talkFormat.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && s.isActive) ||
        (statusFilter === "INACTIVE" && !s.isActive);

      return matchSearch && matchStatus;
    });
  }, [speakers, selectedCategory, searchQuery, statusFilter]);

  // Derived stats
  const stats = useMemo(() => {
    const total = filteredSpeakers.length;
    const active = filteredSpeakers.filter((s) => s.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [filteredSpeakers]);

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingSpeaker(null);
    const defaultSlug =
      activeQuerySlug && activeQuerySlug !== "ALL" && activeQuerySlug !== "CUSTOM"
        ? activeQuerySlug
        : COMMUNITY_DAY_EVENT_SLUG;
    setFormData({
      ...INITIAL_FORM,
      eventSlug: defaultSlug,
    });
    setFormCustomSlug(false);
    setFormError(null);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (speaker: EventSpeaker) => {
    setEditingSpeaker(speaker);
    const isKnown = KNOWN_EVENTS.some((e) => e.slug === speaker.eventSlug);
    setFormCustomSlug(!isKnown);
    setFormData({
      eventSlug: speaker.eventSlug,
      name: speaker.name,
      role: speaker.role,
      company: speaker.company || "",
      photoUrl: speaker.photoUrl,
      topicImageUrl: speaker.topicImageUrl || "",
      talkTitle: speaker.talkTitle,
      talkFormat: speaker.talkFormat || "Keynote",
      bio: speaker.bio || "",
      socialUrl: speaker.socialUrl || "",
      isActive: speaker.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  // Submit Form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSlug = formData.eventSlug.trim();
    if (!targetSlug) {
      setFormError("Please select or enter an Event Slug.");
      return;
    }
    if (!formData.name.trim() || !formData.role.trim() || !formData.talkTitle.trim() || !formData.photoUrl.trim()) {
      setFormError("Please fill out Speaker Name, Role, Photo URL, and Talk Title.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingSpeaker) {
        const payload: EventSpeakerUpdate = {
          name: formData.name.trim(),
          role: formData.role.trim(),
          company: formData.company.trim() || null,
          photoUrl: formData.photoUrl.trim(),
          topicImageUrl: formData.topicImageUrl.trim() || null,
          talkTitle: formData.talkTitle.trim(),
          talkFormat: formData.talkFormat.trim() || null,
          bio: formData.bio.trim() || null,
          socialUrl: formData.socialUrl.trim() || null,
          isActive: formData.isActive,
        };
        const updated = await updateAdminSpeaker(editingSpeaker.eventSlug, editingSpeaker.id, payload);
        setSpeakers((prev) =>
          prev.map((s) => (s.id === editingSpeaker.id && s.eventSlug === editingSpeaker.eventSlug ? updated : s))
        );
      } else {
        const payload: EventSpeakerCreate = {
          name: formData.name.trim(),
          role: formData.role.trim(),
          company: formData.company.trim() || null,
          photoUrl: formData.photoUrl.trim(),
          topicImageUrl: formData.topicImageUrl.trim() || null,
          talkTitle: formData.talkTitle.trim(),
          talkFormat: formData.talkFormat.trim() || null,
          bio: formData.bio.trim() || null,
          socialUrl: formData.socialUrl.trim() || null,
          isActive: formData.isActive,
        };
        const created = await createAdminSpeaker(targetSlug, payload);
        setSpeakers((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save speaker");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (speaker: EventSpeaker) => {
    const nextState = !speaker.isActive;
    // Optimistic update
    setSpeakers((prev) =>
      prev.map((s) => (s.id === speaker.id && s.eventSlug === speaker.eventSlug ? { ...s, isActive: nextState } : s))
    );
    try {
      await updateAdminSpeaker(speaker.eventSlug, speaker.id, {
        name: speaker.name,
        role: speaker.role,
        company: speaker.company,
        photoUrl: speaker.photoUrl,
        topicImageUrl: speaker.topicImageUrl,
        talkTitle: speaker.talkTitle,
        talkFormat: speaker.talkFormat,
        bio: speaker.bio,
        socialUrl: speaker.socialUrl,
        isActive: nextState,
      });
    } catch (err: any) {
      // Revert on error
      setSpeakers((prev) =>
        prev.map((s) => (s.id === speaker.id && s.eventSlug === speaker.eventSlug ? { ...s, isActive: !nextState } : s))
      );
      alert(err?.message || "Failed to update speaker status");
    }
  };

  // Delete Speaker
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminSpeaker(deleteTarget.eventSlug, deleteTarget.id);
      setSpeakers((prev) => prev.filter((s) => !(s.id === deleteTarget.id && s.eventSlug === deleteTarget.eventSlug)));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to delete speaker");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reorder up/down (Available when filtered to a specific event)
  const isSpecificEvent = activeQuerySlug !== "ALL" && activeQuerySlug !== "CUSTOM";
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (!isSpecificEvent) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredSpeakers.length) return;

    const newSpeakers = [...filteredSpeakers];
    const temp = newSpeakers[index];
    newSpeakers[index] = newSpeakers[targetIndex];
    newSpeakers[targetIndex] = temp;

    setSpeakers(newSpeakers);

    const items: EventSpeakerOrderItem[] = newSpeakers.map((s, idx) => ({
      id: s.id,
      displayOrder: idx + 1,
    }));

    try {
      await reorderAdminSpeakers(activeQuerySlug, items);
    } catch (err: any) {
      setSpeakers(filteredSpeakers);
      alert(err?.message || "Failed to save speaker order");
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs: All, Conferences, Monthly Meetups, Workshops */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <Button
            type="button"
            size="sm"
            variant={selectedCategory === "ALL" ? "default" : "outline"}
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedEventSlug("ALL");
            }}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Categories</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={selectedCategory === "Conference" ? "default" : "outline"}
            onClick={() => {
              setSelectedCategory("Conference");
              setSelectedEventSlug("community-day-2026");
            }}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span>Community Day / Conferences</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={selectedCategory === "Monthly Meetup" ? "default" : "outline"}
            onClick={() => {
              setSelectedCategory("Monthly Meetup");
              setSelectedEventSlug("monthly-meetup");
            }}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            <span>Monthly Meetups</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={selectedCategory === "Workshop" ? "default" : "outline"}
            onClick={() => {
              setSelectedCategory("Workshop");
              setSelectedEventSlug("voice-ai-agents-workshop-may-2026");
            }}
            className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5 text-purple-400" />
            <span>Workshops</span>
          </Button>
        </div>

        {/* Event Selector Dropdown within category */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0 hidden md:inline">
            Event Scope:
          </span>
          <Select
            value={selectedEventSlug}
            onValueChange={(val) => {
              setSelectedEventSlug(val);
              if (val !== "CUSTOM") setCustomEventInput("");
            }}
          >
            <SelectTrigger className="w-[240px] sm:w-[280px] bg-background text-xs font-semibold">
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">🌐 All Events in Category</SelectItem>
              {availableEvents.map((evt) => (
                <SelectItem key={evt.slug} value={evt.slug}>
                  {evt.name} {evt.badge && `(${evt.badge})`}
                </SelectItem>
              ))}
              <SelectItem value="CUSTOM">✏️ Custom Event Slug...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Slug Input if CUSTOM chosen */}
      {selectedEventSlug === "CUSTOM" && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
          <Label htmlFor="custom-slug" className="text-xs font-semibold shrink-0">
            Enter Event Slug:
          </Label>
          <Input
            id="custom-slug"
            placeholder="e.g. monthly-meetup-november-2026"
            value={customEventInput}
            onChange={(e) => setCustomEventInput(e.target.value)}
            className="h-8 text-xs max-w-sm bg-background"
          />
          <Button size="sm" variant="secondary" onClick={loadSpeakers} className="h-8 text-xs cursor-pointer">
            Filter Slug
          </Button>
        </div>
      )}

      {/* Header Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Speakers</span>
              <Mic className="h-4 w-4 text-primary opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">
              {stats.total}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Active / Visible</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-500">
              {stats.active}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Hidden / Draft</span>
              <XCircle className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-muted-foreground">
              {stats.inactive}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar: Search, Filters, Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search speaker, talk title, role, event slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onValueChange={(v: "ALL" | "ACTIVE" | "INACTIVE") => setStatusFilter(v)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="INACTIVE">Hidden Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={loadSpeakers}
            title="Refresh list"
            className="cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="gap-2 cursor-pointer bg-primary text-primary-foreground font-semibold shadow"
          >
            <Plus className="h-4 w-4" />
            Add Speaker
          </Button>
        </div>
      </div>

      {/* Main Speakers List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card border border-border/80 rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading speakers…</p>
        </div>
      ) : error ? (
        <div className="bg-card border border-border/80 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={loadSpeakers} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-3">
          <Mic className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-foreground">No speakers found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "ALL" || selectedCategory !== "ALL"
              ? "No speakers match the current filter criteria."
              : "No speakers configured for this event yet. Click 'Add Speaker' to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60">
          {filteredSpeakers.map((speaker, index) => {
            const canMoveUp = isSpecificEvent && index > 0;
            const canMoveDown = isSpecificEvent && index < filteredSpeakers.length - 1;
            const meta = getEventCategoryMeta(speaker.eventSlug);

            return (
              <div
                key={`${speaker.eventSlug}-${speaker.id}`}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                {/* Speaker Info, Topic Banner & Avatar */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    {speaker.topicImageUrl && (
                      <div className="hidden sm:block w-20 aspect-[16/9] rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                        <img
                          src={speaker.topicImageUrl}
                          alt={speaker.talkTitle}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <Avatar className="h-12 w-12 rounded-xl border border-border shrink-0 shadow-sm">
                      <AvatarImage src={speaker.photoUrl} alt={speaker.name} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                        {speaker.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-foreground text-base truncate">
                        {speaker.name}
                      </h4>

                      {/* Event Category Badge */}
                      <Badge
                        variant="secondary"
                        className={cn("text-[11px] px-2 py-0 border font-semibold", meta.color)}
                        title={`Event Slug: ${speaker.eventSlug}`}
                      >
                        {meta.category}: {speaker.eventSlug}
                      </Badge>

                      {speaker.talkFormat && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-2 py-0 bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        >
                          {speaker.talkFormat}
                        </Badge>
                      )}
                      {speaker.isActive ? (
                        <Badge className="text-[11px] px-2 py-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] px-2 py-0 text-muted-foreground border-border">
                          Hidden
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {speaker.role} {speaker.company ? `• ${speaker.company}` : ""}
                    </p>

                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      "{speaker.talkTitle}"
                    </p>

                    {speaker.socialUrl && (
                      <a
                        href={speaker.socialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-0.5"
                      >
                        <span>Profile Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions: Reorder, Active Switch, Edit, Delete */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {/* Reorder Buttons (enabled when scoped to specific event) */}
                  {isSpecificEvent && (
                    <div className="flex items-center gap-1 mr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!canMoveUp}
                        onClick={() => handleMoveOrder(index, "up")}
                        title="Move Up"
                        className="h-8 w-8 cursor-pointer disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!canMoveDown}
                        onClick={() => handleMoveOrder(index, "down")}
                        title="Move Down"
                        className="h-8 w-8 cursor-pointer disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2 mr-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(speaker)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        speaker.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                      role="switch"
                      aria-checked={speaker.isActive}
                      title={speaker.isActive ? "Visible on site (Click to hide)" : "Hidden from site (Click to show)"}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                          speaker.isActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Edit */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(speaker)}
                    className="gap-1.5 cursor-pointer text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(speaker)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Speaker Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSpeaker ? "Edit Speaker" : "Add New Speaker"}
            </DialogTitle>
            <DialogDescription>
              Configure speaker credentials, talk format, event category, and public visibility.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            {/* Event Category & Slug Assignment */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2">
              <Label htmlFor="sp-event" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Event & Category *
              </Label>
              {!formCustomSlug ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.eventSlug}
                    onValueChange={(val) => {
                      if (val === "CUSTOM") {
                        setFormCustomSlug(true);
                      } else {
                        setFormData({ ...formData, eventSlug: val });
                      }
                    }}
                  >
                    <SelectTrigger id="sp-event" className="bg-background">
                      <SelectValue placeholder="Choose Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="community-day-2026">🌟 AWS Community Day Jakarta 2026</SelectItem>
                      <SelectItem value="monthly-meetup">📅 Monthly Meetups (General / Upcoming)</SelectItem>
                      <SelectItem value="aws-ug-jakarta-redis-october-2026">📅 October 2026 Meetup (with Redis)</SelectItem>
                      <SelectItem value="monthly-meetup-july-2026">📅 July 2026 Meetup</SelectItem>
                      <SelectItem value="monthly-meetup-june-2026">📅 June 2026 Meetup</SelectItem>
                      <SelectItem value="monthly-meetup-april-2026">📅 April 2026 Meetup</SelectItem>
                      <SelectItem value="voice-ai-agents-workshop-may-2026">🛠️ Voice AI Agents Workshop</SelectItem>
                      <SelectItem value="CUSTOM">✏️ Custom Event Slug...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. monthly-meetup-november-2026"
                      value={formData.eventSlug}
                      onChange={(e) => setFormData({ ...formData, eventSlug: e.target.value })}
                      required
                      className="bg-background"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormCustomSlug(false)}
                      className="text-xs shrink-0 cursor-pointer"
                    >
                      Use Presets
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sp-name">Speaker Name *</Label>
                <Input
                  id="sp-name"
                  placeholder="e.g. Donnie Prakoso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sp-role">Role / Job Title *</Label>
                <Input
                  id="sp-role"
                  placeholder="e.g. Principal Developer Advocate"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sp-company">Company / Organization</Label>
                <Input
                  id="sp-company"
                  placeholder="e.g. AWS"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sp-photo">Profile Photo URL *</Label>
                <Input
                  id="sp-photo"
                  placeholder="https://..."
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-topic-img">Topic / Session Cover Banner URL</Label>
              <Input
                id="sp-topic-img"
                placeholder="https://... (16:9 topic banner image)"
                value={formData.topicImageUrl}
                onChange={(e) => setFormData({ ...formData, topicImageUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="sp-talk">Talk / Session Title *</Label>
                <Input
                  id="sp-talk"
                  placeholder="e.g. Architecting Scalable Serverless Applications"
                  value={formData.talkTitle}
                  onChange={(e) => setFormData({ ...formData, talkTitle: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sp-format">Talk Format</Label>
                <Select
                  value={formData.talkFormat}
                  onValueChange={(val) => setFormData({ ...formData, talkFormat: val })}
                >
                  <SelectTrigger id="sp-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Keynote">Keynote</SelectItem>
                    <SelectItem value="Technical Track">Technical Track</SelectItem>
                    <SelectItem value="Deep Dive">Deep Dive</SelectItem>
                    <SelectItem value="Lightning Talk">Lightning Talk</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Panel Discussion">Panel Discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-bio">Short Bio</Label>
              <Textarea
                id="sp-bio"
                placeholder="Brief background of the speaker..."
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="sp-social">Social / LinkedIn URL</Label>
                <Input
                  id="sp-social"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.socialUrl}
                  onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2 sm:pt-6">
                <Checkbox
                  id="sp-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: Boolean(checked) })}
                />
                <Label htmlFor="sp-active" className="cursor-pointer text-xs font-medium">
                  Visible to Public (Active)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer bg-primary text-primary-foreground font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editingSpeaker ? (
                  "Save Changes"
                ) : (
                  "Create Speaker"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Speaker</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong> from{" "}
              <strong className="text-foreground">{deleteTarget?.eventSlug}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

(SpeakerDirectoryManager as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";

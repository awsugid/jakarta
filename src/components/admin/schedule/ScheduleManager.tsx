"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
  Clock,
  MapPin,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  DownloadCloud,
  Loader2,
  X,
  User,
  Building,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  fetchAdminSchedule,
  createAdminScheduleItem,
  updateAdminScheduleItem,
  deleteAdminScheduleItem,
  syncSessionizeSchedule,
  fetchSessionizeData,
} from "@/lib/api";
import type {
  EventScheduleItem,
  CreateScheduleItem,
  UpdateScheduleItem,
  EnrichedSession,
  SessionizeDataResponse,
} from "@/lib/types";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

export const KNOWN_SCHEDULE_EVENTS = [
  { slug: "community-day-2026", name: "AWS Community Day Jakarta 2026" },
  { slug: "monthly-meetup", name: "Monthly Meetup (Global / General)" },
  { slug: "voice-ai-agents-workshop-may-2026", name: "Voice AI Agents Workshop 2026" },
];

const SESSION_TYPES = [
  "Technical Session",
  "Workshop",
  "Plenum / Keynote",
  "Panel Discussion",
  "Fireside Chat",
  "Service Session",
];

const ROOM_OPTIONS = ["All Stages", "Atrium", "800", "Room 800", "Main Stage", "Breakout Room"];

function formatTimeDisplay(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt) return "TBA";
  try {
    const s = new Date(startsAt);
    const startStr = s.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Jakarta",
    });
    if (!endsAt) return `${startStr} WIB`;
    const e = new Date(endsAt);
    const endStr = e.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Jakarta",
    });
    return `${startStr} – ${endStr} WIB`;
  } catch {
    return startsAt;
  }
}

export function ScheduleManager() {
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>(COMMUNITY_DAY_EVENT_SLUG);
  const [scheduleItems, setScheduleItems] = useState<EventScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("All Stages");
  const [selectedType, setSelectedType] = useState("ALL");

  // Edit / Create Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);
  const [formData, setFormData] = useState<CreateScheduleItem>({
    title: "",
    description: "",
    speakerName: "",
    speakerRole: "",
    speakerCompany: "",
    speakerAvatar: "",
    speakerSocialUrl: "",
    room: "Atrium",
    track: "",
    startsAt: "2026-10-31T02:00:00Z",
    endsAt: "2026-10-31T02:40:00Z",
    sessionType: "Technical Session",
    isServiceSession: false,
    isActive: true,
    displayOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Sessionize Browser Modal State
  const [sessionizeModalOpen, setSessionizeModalOpen] = useState(false);
  const [sessionizeData, setSessionizeData] = useState<SessionizeDataResponse | null>(null);
  const [sessionizeLoading, setSessionizeLoading] = useState(false);
  const [sessionizeError, setSessionizeError] = useState<string | null>(null);
  const [sessionizeSearch, setSessionizeSearch] = useState("");
  const [sessionizeRoomFilter, setSessionizeRoomFilter] = useState("ALL");
  const [sessionizeJobFilter, setSessionizeJobFilter] = useState("ALL");
  const [sessionizeCompanyFilter, setSessionizeCompanyFilter] = useState("ALL");
  const [syncingAll, setSyncingAll] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  // Load Schedule Items
  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminSchedule(selectedEventSlug);
      setScheduleItems(res.schedule || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load schedule");
      setScheduleItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedEventSlug]);

  // Load Sessionize Data for Explorer
  const loadSessionize = async (fresh = false) => {
    try {
      setSessionizeLoading(true);
      setSessionizeError(null);
      const data = await fetchSessionizeData({ fresh });
      setSessionizeData(data);
    } catch (err: any) {
      setSessionizeError(err?.message || "Failed to load Sessionize data");
    } finally {
      setSessionizeLoading(false);
    }
  };

  // Open Sessionize Explorer Modal
  const handleOpenSessionizeModal = () => {
    setSessionizeModalOpen(true);
    if (!sessionizeData) {
      loadSessionize(false);
    }
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      speakerName: "",
      speakerRole: "",
      speakerCompany: "",
      speakerAvatar: "",
      speakerSocialUrl: "",
      room: selectedRoom !== "All Stages" ? selectedRoom : "Atrium",
      track: "",
      startsAt: "2026-10-31T02:00:00Z",
      endsAt: "2026-10-31T02:40:00Z",
      sessionType: "Technical Session",
      isServiceSession: false,
      isActive: true,
      displayOrder: scheduleItems.length,
    });
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: EventScheduleItem) => {
    setEditingItem(item);
    setFormData({
      sessionId: item.sessionId,
      title: item.title,
      description: item.description || "",
      speakerId: item.speakerId,
      speakerName: item.speakerName || "",
      speakerRole: item.speakerRole || "",
      speakerCompany: item.speakerCompany || "",
      speakerAvatar: item.speakerAvatar || "",
      speakerSocialUrl: item.speakerSocialUrl || "",
      room: item.room || "Atrium",
      track: item.track || "",
      startsAt: item.startsAt || "",
      endsAt: item.endsAt || "",
      sessionType: item.sessionType || "Technical Session",
      isServiceSession: item.isServiceSession,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    });
    setDialogOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await updateAdminScheduleItem(selectedEventSlug, editingItem.id, formData);
      } else {
        await createAdminScheduleItem(selectedEventSlug, formData);
      }
      setDialogOpen(false);
      await loadSchedule();
    } catch (err: any) {
      alert(err?.message || "Failed to save schedule item");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (item: EventScheduleItem) => {
    try {
      await updateAdminScheduleItem(selectedEventSlug, item.id, {
        isActive: !item.isActive,
      });
      setScheduleItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: !it.isActive } : it))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to toggle status");
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: EventScheduleItem) => {
    if (!confirm(`Are you sure you want to delete session "${item.title}"?`)) {
      return;
    }
    try {
      await deleteAdminScheduleItem(selectedEventSlug, item.id);
      setScheduleItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete schedule item");
    }
  };

  // Single Sessionize Session Import
  const handleImportSingleSession = async (sess: EnrichedSession) => {
    try {
      setImportingId(sess.id);
      await syncSessionizeSchedule(selectedEventSlug, {
        sessionIds: [sess.id],
        overwrite: true,
      });
      await loadSchedule();
    } catch (err: any) {
      alert(err?.message || "Failed to import session");
    } finally {
      setImportingId(null);
    }
  };

  // Full Sessionize Sync
  const handleSyncAllSessionize = async () => {
    if (!confirm("Sync all accepted sessions from Sessionize into this event schedule?")) {
      return;
    }
    try {
      setSyncingAll(true);
      const res = await syncSessionizeSchedule(selectedEventSlug, {
        overwrite: true,
        fresh: true,
      });
      alert(`Synchronized successfully! Imported: ${res.imported}, Updated: ${res.updated}.`);
      await loadSchedule();
    } catch (err: any) {
      alert(err?.message || "Sync from Sessionize failed");
    } finally {
      setSyncingAll(false);
    }
  };

  // Filtered schedule items
  const filteredSchedule = useMemo(() => {
    return scheduleItems.filter((item) => {
      // Room filter
      if (selectedRoom !== "All Stages") {
        const itemRoom = (item.room || "").toLowerCase();
        const target = selectedRoom.toLowerCase();
        if (!itemRoom.includes(target) && !target.includes(itemRoom)) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== "ALL") {
        if (selectedType === "Service Session" && !item.isServiceSession) {
          return false;
        }
        if (selectedType !== "Service Session" && item.sessionType !== selectedType) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description?.toLowerCase().includes(q) ?? false;
        const inSpeaker = item.speakerName?.toLowerCase().includes(q) ?? false;
        const inCompany = item.speakerCompany?.toLowerCase().includes(q) ?? false;
        const inRoom = item.room?.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inDesc && !inSpeaker && !inCompany && !inRoom) {
          return false;
        }
      }

      return true;
    });
  }, [scheduleItems, selectedRoom, selectedType, searchQuery]);

  // Filtered Sessionize sessions in explorer modal
  const filteredSessionizeSessions = useMemo(() => {
    if (!sessionizeData) return [];
    return sessionizeData.sessions.filter((sess) => {
      if (sessionizeRoomFilter !== "ALL") {
        if ((sess.room || "").toLowerCase() !== sessionizeRoomFilter.toLowerCase()) {
          return false;
        }
      }
      if (sessionizeJobFilter !== "ALL") {
        const hasJob = sess.speakers.some((sp) =>
          (sp.jobTitle || "").toLowerCase().includes(sessionizeJobFilter.toLowerCase())
        );
        if (!hasJob) return false;
      }
      if (sessionizeCompanyFilter !== "ALL") {
        const hasComp = sess.speakers.some((sp) =>
          (sp.company || "").toLowerCase().includes(sessionizeCompanyFilter.toLowerCase())
        );
        if (!hasComp) return false;
      }
      if (sessionizeSearch.trim()) {
        const q = sessionizeSearch.toLowerCase();
        const inTitle = sess.title.toLowerCase().includes(q);
        const inDesc = (sess.description || "").toLowerCase().includes(q);
        const inSpk = sess.speakers.some(
          (sp) =>
            sp.name.toLowerCase().includes(q) ||
            (sp.company || "").toLowerCase().includes(q) ||
            (sp.tagLine || "").toLowerCase().includes(q)
        );
        if (!inTitle && !inDesc && !inSpk) return false;
      }
      return true;
    });
  }, [
    sessionizeData,
    sessionizeRoomFilter,
    sessionizeJobFilter,
    sessionizeCompanyFilter,
    sessionizeSearch,
  ]);

  // Set of session IDs already present in current schedule
  const existingSessionIds = useMemo(() => {
    return new Set(scheduleItems.map((it) => it.sessionId).filter(Boolean));
  }, [scheduleItems]);

  const distinctRooms = useMemo(() => {
    const s = new Set<string>();
    scheduleItems.forEach((it) => {
      if (it.room && it.room.trim()) s.add(it.room.trim());
    });
    return Array.from(s);
  }, [scheduleItems]);

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-card via-background to-muted/30 border border-border/80 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Schedule & Agenda Configuration
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Event Schedule Manager
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Configure event timeline, session stages, rooms, and sync real-time speaker talks from
            Sessionize.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {/* Event Selector */}
          <Select value={selectedEventSlug} onValueChange={setSelectedEventSlug}>
            <SelectTrigger className="w-[260px] bg-card border-border h-10 text-xs font-medium">
              <CalendarClock className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent>
              {KNOWN_SCHEDULE_EVENTS.map((evt) => (
                <SelectItem key={evt.slug} value={evt.slug} className="text-xs">
                  {evt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sessionize Explorer Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenSessionizeModal}
            className="h-10 px-3.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 cursor-pointer text-xs font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-orange-400" />
            Sessionize Data
          </Button>

          {/* Add Session Action */}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs font-semibold shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Metrics & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/80">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Sessions
          </p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{scheduleItems.length}</p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/80">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active on Schedule
          </p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            {scheduleItems.filter((i) => i.isActive).length}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/80">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Stages & Rooms
          </p>
          <p className="text-2xl font-extrabold text-purple-400 mt-1">
            {distinctRooms.length || 0}
          </p>
        </Card>
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/80">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            From Sessionize
          </p>
          <p className="text-2xl font-extrabold text-orange-400 mt-1">
            {existingSessionIds.size}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions by title, speaker, company, room, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Room Filter */}
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
              <MapPin className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Stages" className="text-xs">
                All Stages
              </SelectItem>
              {distinctRooms.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Session Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-background">
              <Filter className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Formats
              </SelectItem>
              {SESSION_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadSchedule}
            disabled={loading}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Schedule List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading event schedule...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
          <Button size="sm" variant="outline" onClick={loadSchedule}>
            Try Again
          </Button>
        </div>
      ) : filteredSchedule.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/40 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">No Schedule Items Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {searchQuery || selectedRoom !== "All Stages"
                ? "No sessions match your filter criteria. Try resetting filters."
                : "This event does not have any schedule items configured yet. You can import talks directly from Sessionize or add custom agenda items."}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenSessionizeModal}
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Import from Sessionize
            </Button>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Custom Session
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredSchedule.map((item, idx) => {
            const isExpanded = expandedDescIds[item.id] || false;
            return (
              <Card
                key={item.id}
                className={`p-5 transition-all duration-200 border-border/80 ${
                  item.isActive
                    ? "bg-card/75 hover:border-orange-500/40"
                    : "bg-muted/20 opacity-60 border-dashed"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Time, Room, and Title */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Order Index */}
                      <span className="font-mono text-[11px] text-muted-foreground/60 w-6">
                        #{idx + 1}
                      </span>

                      {/* Time Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        <Clock className="h-3 w-3" />
                        {formatTimeDisplay(item.startsAt, item.endsAt)}
                      </span>

                      {/* Room Badge */}
                      {item.room && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          <MapPin className="h-3 w-3" />
                          {item.room}
                        </span>
                      )}

                      {/* Session Type Badge */}
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-medium bg-muted/60 text-foreground"
                      >
                        {item.sessionType || "Technical Session"}
                      </Badge>

                      {/* Sessionize Origin Badge */}
                      {item.sessionId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                          Sessionize #{item.sessionId}
                        </span>
                      )}

                      {/* Active / Inactive Pill */}
                      {!item.isActive && (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                          Draft / Inactive
                        </Badge>
                      )}
                    </div>

                    {/* Session Title */}
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                      {item.title}
                    </h3>

                    {/* Speaker Info Row */}
                    {item.speakerName && (
                      <div className="flex items-center gap-2.5 pt-1">
                        <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                          <AvatarImage src={item.speakerAvatar || undefined} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {item.speakerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-xs truncate">
                          <span className="font-semibold text-foreground mr-1.5">
                            {item.speakerName}
                          </span>
                          {(item.speakerRole || item.speakerCompany) && (
                            <span className="text-muted-foreground">
                              · {item.speakerRole}
                              {item.speakerCompany ? ` (${item.speakerCompany})` : ""}
                            </span>
                          )}
                        </div>
                        {item.speakerSocialUrl && (
                          <a
                            href={item.speakerSocialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors shrink-0"
                            title="LinkedIn Profile"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Description preview */}
                    {item.description && (
                      <div className="text-xs text-muted-foreground leading-relaxed pt-1">
                        <p className={isExpanded ? "" : "line-clamp-2"}>{item.description}</p>
                        {item.description.length > 140 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDescIds((prev) => ({
                                ...prev,
                                [item.id]: !isExpanded,
                              }))
                            }
                            className="text-[11px] text-primary hover:underline font-semibold mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                Show Less <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Read Full Abstract <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                      className={`h-8 text-xs cursor-pointer ${
                        item.isActive
                          ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.isActive ? "Active" : "Activate"}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 text-xs cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Schedule Session" : "Add New Schedule Session"}
            </DialogTitle>
            <DialogDescription>
              Configure stage room, session title, time slot, and speaker presentation details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sess-title">Session Title *</Label>
              <Input
                id="sess-title"
                placeholder="e.g. Architecting for the Future: Scaling Modern Workloads..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sess-room">Stage / Room</Label>
                <Input
                  id="sess-room"
                  placeholder="e.g. Atrium, Room 800, Main Stage"
                  value={formData.room || ""}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sess-type">Session Type</Label>
                <Select
                  value={formData.sessionType || "Technical Session"}
                  onValueChange={(val) => setFormData({ ...formData, sessionType: val })}
                >
                  <SelectTrigger id="sess-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sess-start">Starts At (ISO / Time string)</Label>
                <Input
                  id="sess-start"
                  placeholder="2026-10-31T02:00:00Z"
                  value={formData.startsAt || ""}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sess-end">Ends At (ISO / Time string)</Label>
                <Input
                  id="sess-end"
                  placeholder="2026-10-31T02:40:00Z"
                  value={formData.endsAt || ""}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>
            </div>

            {/* Speaker Information Section */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Presenter & Speaker Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sp-name" className="text-xs">
                    Speaker Name
                  </Label>
                  <Input
                    id="sp-name"
                    placeholder="e.g. Arief Nugraha"
                    value={formData.speakerName || ""}
                    onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-role" className="text-xs">
                    Job Title / Role
                  </Label>
                  <Input
                    id="sp-role"
                    placeholder="e.g. Senior Solutions Architect"
                    value={formData.speakerRole || ""}
                    onChange={(e) => setFormData({ ...formData, speakerRole: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-company" className="text-xs">
                    Company
                  </Label>
                  <Input
                    id="sp-company"
                    placeholder="e.g. AWS"
                    value={formData.speakerCompany || ""}
                    onChange={(e) => setFormData({ ...formData, speakerCompany: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-social" className="text-xs">
                    LinkedIn URL
                  </Label>
                  <Input
                    id="sp-social"
                    placeholder="https://www.linkedin.com/in/..."
                    value={formData.speakerSocialUrl || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, speakerSocialUrl: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sp-avatar" className="text-xs">
                  Speaker Avatar URL
                </Label>
                <Input
                  id="sp-avatar"
                  placeholder="https://cdn.sessionize.com/image/..."
                  value={formData.speakerAvatar || ""}
                  onChange={(e) => setFormData({ ...formData, speakerAvatar: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sess-desc">Description / Session Abstract</Label>
              <Textarea
                id="sess-desc"
                rows={4}
                placeholder="Full session details, architectural takeaways, and attendee learning points..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-border"
                />
                Published / Active on Schedule
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={formData.isServiceSession ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, isServiceSession: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Service Session (Registration / Break / Lunch)
              </label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {editingItem ? "Update Session" : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sessionize Live Explorer Modal */}
      <Dialog open={sessionizeModalOpen} onOpenChange={setSessionizeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Live Sessionize Integration
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                  Sessionize Talks & Speaker Roster
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Browse confirmed submissions, stage assignments, and speaker profiles directly
                  from Sessionize (edge-cached with search & filters).
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadSessionize(true)}
                  disabled={sessionizeLoading}
                  className="h-8 text-xs cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${sessionizeLoading ? "animate-spin" : ""}`}
                  />
                  Refresh Cache
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSyncAllSessionize}
                  disabled={syncingAll || sessionizeLoading}
                  className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer shadow"
                >
                  {syncingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <DownloadCloud className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Sync All to Schedule
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search talk title, speaker, bio, company..."
                  value={sessionizeSearch}
                  onChange={(e) => setSessionizeSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {/* Room Filter */}
              <Select value={sessionizeRoomFilter} onValueChange={setSessionizeRoomFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Rooms
                  </SelectItem>
                  {sessionizeData?.metadata.rooms.map((rm) => (
                    <SelectItem key={rm} value={rm} className="text-xs">
                      {rm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Job Title Filter */}
              <Select value={sessionizeJobFilter} onValueChange={setSessionizeJobFilter}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Roles
                  </SelectItem>
                  {sessionizeData?.metadata.job_titles.map((jb) => (
                    <SelectItem key={jb} value={jb} className="text-xs">
                      {jb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {sessionizeLoading ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
                <p className="text-xs text-muted-foreground">Fetching Sessionize data...</p>
              </div>
            ) : sessionizeError ? (
              <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-semibold">{sessionizeError}</p>
              </div>
            ) : filteredSessionizeSessions.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground text-xs">
                No sessions found matching your search and filter criteria.
              </div>
            ) : (
              filteredSessionizeSessions.map((sess) => {
                const isImported = existingSessionIds.has(sess.id);
                const speaker = sess.speakers[0];

                return (
                  <Card
                    key={sess.id}
                    className="p-5 border-border/80 bg-card hover:border-orange-500/30 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                            <Clock className="h-3 w-3" />
                            {formatTimeDisplay(sess.startsAt, sess.endsAt)}
                          </span>

                          {sess.room && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              <MapPin className="h-3 w-3" />
                              {sess.room}
                            </span>
                          )}

                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Sessionize ID #{sess.id}
                          </Badge>

                          {sess.status && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            >
                              {sess.status}
                            </Badge>
                          )}
                        </div>

                        {/* Session Title */}
                        <h4 className="text-base font-bold text-foreground leading-snug">
                          {sess.title}
                        </h4>

                        {/* Speaker Preview */}
                        {speaker && (
                          <div className="flex items-center gap-3 pt-1">
                            <Avatar className="h-9 w-9 rounded-full border border-border shadow-sm">
                              <AvatarImage src={speaker.profilePicture || undefined} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {speaker.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                {speaker.name}
                                {speaker.linkedinUrl && (
                                  <a
                                    href={speaker.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {speaker.jobTitle || speaker.tagLine || "Speaker"}
                                {speaker.company ? ` · ${speaker.company}` : ""}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Abstract */}
                        {sess.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pt-1">
                            {sess.description}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0 pt-2 md:pt-0">
                        {isImported ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2.5 py-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              In Schedule
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleImportSingleSession(sess)}
                              disabled={importingId === sess.id}
                              className="h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {importingId === sess.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Update Info
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleImportSingleSession(sess)}
                            disabled={importingId === sess.id}
                            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm font-semibold"
                          >
                            {importingId === sess.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Import to Schedule
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

(ScheduleManager as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";

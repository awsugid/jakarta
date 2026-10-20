"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
  Clock,
  MapPin,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mic,
  BookOpen,
  Building,
  User,
  Tag,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchPublicSchedule, fetchSessionizeSessions } from "@/lib/api";
import type { EventScheduleItem, EnrichedSession } from "@/lib/types";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import { cn } from "@/lib/utils";

interface ComDayScheduleProps {
  eventSlug?: string;
  className?: string;
}

interface DisplayScheduleSession {
  id: string;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  room?: string | null;
  track?: string | null;
  sessionType?: string | null;
  isServiceSession: boolean;
  speakerName?: string | null;
  speakerRole?: string | null;
  speakerCompany?: string | null;
  speakerAvatar?: string | null;
  speakerSocialUrl?: string | null;
}

function formatTime(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt) return "Time TBA";
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

function getFormatBadgeClass(type?: string | null): string {
  if (!type) return "bg-primary/10 text-primary border-primary/30";
  const lower = type.toLowerCase();
  if (lower.includes("keynote") || lower.includes("plenum")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  }
  if (lower.includes("workshop") || lower.includes("hands-on")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/40";
  }
  if (lower.includes("panel")) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/40";
  }
  if (lower.includes("service") || lower.includes("break") || lower.includes("lunch")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  }
  return "bg-sky-500/15 text-sky-400 border-sky-500/40";
}

function getRoomBadgeClass(room?: string | null): string {
  if (!room) return "bg-muted text-muted-foreground border-border";
  const lower = room.toLowerCase();
  if (lower.includes("atrium") || lower.includes("main")) {
    return "bg-orange-500/15 text-orange-400 border-orange-500/40";
  }
  if (lower.includes("800")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/40";
  }
  return "bg-cyan-500/15 text-cyan-400 border-cyan-500/40";
}

export function ComDaySchedule({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  className,
}: ComDayScheduleProps) {
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      try {
        setLoading(true);
        setError(null);

        // 1. First try fetching configured schedule from backend D1
        const d1Res = await fetchPublicSchedule(eventSlug).catch(() => null);
        if (!cancelled && d1Res && d1Res.schedule && d1Res.schedule.length > 0) {
          const mapped: DisplayScheduleSession[] = d1Res.schedule.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            room: item.room,
            track: item.track,
            sessionType: item.sessionType,
            isServiceSession: item.isServiceSession,
            speakerName: item.speakerName,
            speakerRole: item.speakerRole,
            speakerCompany: item.speakerCompany,
            speakerAvatar: item.speakerAvatar,
            speakerSocialUrl: item.speakerSocialUrl,
          }));
          setSessions(mapped);
          setLoading(false);
          return;
        }

        // 2. Fallback: fetch confirmed sessions from Sessionize cached endpoint
        const sessionizeRes = await fetchSessionizeSessions().catch(() => null);
        if (!cancelled && sessionizeRes && sessionizeRes.sessions && sessionizeRes.sessions.length > 0) {
          const mapped: DisplayScheduleSession[] = sessionizeRes.sessions.map((s) => {
            const firstSpeaker = s.speakers[0];
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              startsAt: s.startsAt,
              endsAt: s.endsAt,
              room: s.room,
              track: null,
              sessionType: s.isServiceSession
                ? "Service Session"
                : s.isPlenumSession
                ? "Plenum / Keynote"
                : "Technical Session",
              isServiceSession: s.isServiceSession,
              speakerName: firstSpeaker?.name,
              speakerRole: firstSpeaker?.jobTitle || firstSpeaker?.tagLine,
              speakerCompany: firstSpeaker?.company,
              speakerAvatar: firstSpeaker?.profilePicture,
              speakerSocialUrl: firstSpeaker?.linkedinUrl,
            };
          });
          setSessions(mapped);
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setSessions([]);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load schedule");
          setSessions([]);
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  // Extract distinct stages/rooms
  const availableRooms = useMemo(() => {
    const s = new Set<string>();
    sessions.forEach((item) => {
      if (item.room && item.room.trim()) {
        s.add(item.room.trim());
      }
    });
    return Array.from(s).sort();
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      // Room filter
      if (selectedRoom !== "ALL") {
        if ((sess.room || "").toLowerCase() !== selectedRoom.toLowerCase()) {
          return false;
        }
      }

      // Format filter
      if (selectedFormat !== "ALL") {
        if (selectedFormat === "Service" && !sess.isServiceSession) {
          return false;
        }
        if (selectedFormat !== "Service" && sess.sessionType !== selectedFormat) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = sess.title.toLowerCase().includes(q);
        const inDesc = (sess.description || "").toLowerCase().includes(q);
        const inSpeaker = (sess.speakerName || "").toLowerCase().includes(q);
        const inCompany = (sess.speakerCompany || "").toLowerCase().includes(q);
        const inRoom = (sess.room || "").toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inSpeaker && !inCompany && !inRoom) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedRoom, selectedFormat, searchQuery]);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Search & Stage Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-lg">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedRoom("ALL")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedRoom === "ALL"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            All Stages & Tracks ({sessions.length})
          </button>

          {availableRooms.map((room) => {
            const count = sessions.filter(
              (s) => (s.room || "").toLowerCase() === room.toLowerCase()
            ).length;
            return (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                  selectedRoom === room
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{room}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search topic, speaker, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs bg-background/90 border-border"
          />
        </div>
      </div>

      {/* Main Sessions Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading confirmed event agenda...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/40 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-bold text-foreground">No Sessions Found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery || selectedRoom !== "ALL"
              ? "No talks matched your current search filters. Try clearing your search."
              : "The schedule is currently being finalized. Please check back shortly!"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session, idx) => {
            const isExpanded = expandedIds[session.id] || false;

            return (
              <Card
                key={session.id}
                className="border-border/80 bg-card/75 backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-xl hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden group"
              >
                {/* Subtle Ambient Glow */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-orange-500/5 to-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                  {/* Left Column: Time & Room Details */}
                  <div className="lg:w-48 shrink-0 space-y-2.5">
                    {/* Time Slot Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-sm">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(session.startsAt, session.endsAt)}
                    </div>

                    {/* Room Badge */}
                    {session.room && (
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm",
                            getRoomBadgeClass(session.room)
                          )}
                        >
                          <MapPin className="h-3 w-3" />
                          {session.room}
                        </span>
                      </div>
                    )}

                    {/* Session Type */}
                    <div>
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold shadow-sm border",
                          getFormatBadgeClass(session.sessionType)
                        )}
                      >
                        {session.sessionType || "Technical Session"}
                      </Badge>
                    </div>
                  </div>

                  {/* Center Column: Session Title, Abstract & Details */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-snug group-hover:text-orange-400 transition-colors">
                      {session.title}
                    </h3>

                    {/* Abstract / Description */}
                    {session.description && (
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        <p className={isExpanded ? "" : "line-clamp-3"}>
                          {session.description}
                        </p>
                        {session.description.length > 180 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIds((prev) => ({
                                ...prev,
                                [session.id]: !isExpanded,
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold mt-1.5 cursor-pointer transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                Show less <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Read full abstract <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Presenter Spotlight */}
                  {session.speakerName && (
                    <div className="lg:w-64 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/60">
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 rounded-2xl border-2 border-orange-500/30 shadow-md shrink-0">
                            <AvatarImage src={session.speakerAvatar || undefined} />
                            <AvatarFallback className="rounded-2xl bg-primary/20 text-primary font-bold text-sm">
                              {session.speakerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {session.speakerName}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {session.speakerRole || "Presenter"}
                            </p>
                          </div>
                        </div>

                        {session.speakerCompany && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 truncate">
                            <Building className="h-3 w-3 shrink-0 text-orange-400" />
                            <span className="truncate">{session.speakerCompany}</span>
                          </div>
                        )}

                        {session.speakerSocialUrl && (
                          <a
                            href={session.speakerSocialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            <span>Speaker Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DownloadCloud,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { fetchSessionizeData, syncSessionizeSchedule } from "@/lib/api";
import { sessionizeCategoryValues } from "@/lib/schedule-metadata";
import type { EnrichedSession, SessionizeDataResponse } from "@/lib/types";

interface SessionizeExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSlug: string;
  existingSessionIds: Set<string>;
  onImported: () => void | Promise<void>;
}

function formatTimeDisplay(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt) return "No time set";
  try {
    const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Jakarta" };
    const s = new Date(startsAt).toLocaleTimeString("en-US", opts);
    if (!endsAt) return `${s} WIB`;
    return `${s} – ${new Date(endsAt).toLocaleTimeString("en-US", opts)} WIB`;
  } catch {
    return startsAt;
  }
}

export function SessionizeExplorer({ open, onOpenChange, eventSlug, existingSessionIds, onImported }: SessionizeExplorerProps) {
  const [data, setData] = useState<SessionizeDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [syncingAll, setSyncingAll] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "status"; text: string } | null>(null);

  async function load(fresh = false) {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchSessionizeData({ fresh }));
    } catch (err: any) {
      setError(err?.message || "Failed to load Sessionize data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !data && !loading) load(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessions = useMemo(() => {
    if (!data || !Array.isArray(data.sessions)) return [];
    return data.sessions.filter((sess) => {
      const speakers = Array.isArray(sess.speakers) ? sess.speakers : [];
      if (roomFilter !== "ALL" && (sess.room || "").toLowerCase() !== roomFilter.toLowerCase()) return false;
      if (jobFilter !== "ALL" && !speakers.some((sp) => (sp.jobTitle || "").toLowerCase().includes(jobFilter.toLowerCase()))) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          (sess.title || "").toLowerCase().includes(q) ||
          (sess.description || "").toLowerCase().includes(q) ||
          speakers.some(
            (sp) =>
              (sp.name || "").toLowerCase().includes(q) ||
              (sp.company || "").toLowerCase().includes(q) ||
              (sp.tagLine || "").toLowerCase().includes(q),
          );
        if (!hit) return false;
      }
      return true;
    });
  }, [data, roomFilter, jobFilter, search]);

  async function importOne(sess: EnrichedSession) {
    try {
      setImportingId(sess.id);
      setNotice(null);
      await syncSessionizeSchedule(eventSlug, { sessionIds: [sess.id], overwrite: false });
      setNotice({ kind: "status", text: `Imported “${sess.title}” as an unscheduled draft.` });
      await onImported();
    } catch (err: any) {
      setNotice({ kind: "error", text: err?.message || "Failed to import session" });
    } finally {
      setImportingId(null);
    }
  }

  async function syncAll() {
    if (!window.confirm("Import all accepted Sessionize sessions as unscheduled drafts?")) return;
    try {
      setSyncingAll(true);
      setNotice(null);
      const res = await syncSessionizeSchedule(eventSlug, { overwrite: false, fresh: true });
      setNotice({ kind: "status", text: `Imported ${res.imported} new drafts, refreshed ${res.updated} existing.` });
      await onImported();
    } catch (err: any) {
      setNotice({ kind: "error", text: err?.message || "Sync from Sessionize failed" });
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                Sessionize Talks
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Imports land as <strong>unscheduled drafts</strong> — assign rooms and times in the workspace.
                Upstream room/time data is not needed.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => load(true)} disabled={loading} className="h-8 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={syncAll} disabled={syncingAll || loading} className="h-8 text-xs font-semibold">
                {syncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <DownloadCloud className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
                Import All as Drafts
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search talk, speaker, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
                aria-label="Search Sessionize sessions"
              />
            </div>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="h-8 text-xs bg-background" aria-label="Filter by upstream room">
                <SelectValue placeholder="Room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Rooms</SelectItem>
                {(data?.metadata?.rooms || []).map((rm) => (
                  <SelectItem key={rm} value={rm}>{rm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="h-8 text-xs bg-background" aria-label="Filter by role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {(data?.metadata?.jobTitles || (data?.metadata as any)?.job_titles || []).map((jb: string) => (
                  <SelectItem key={jb} value={jb}>{jb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={
                notice.kind === "error"
                  ? "text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5"
                  : "text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5"
              }
            >
              {notice.text}
            </p>
          )}
          {loading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Fetching Sessionize data…</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-3">
              <AlertCircle className="h-6 w-6 mx-auto" />
              <p className="text-sm font-semibold">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => load(false)}>Try Again</Button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-xs">
              No sessions match your search and filters.
            </p>
          ) : (
            sessions.map((sess) => {
              const isImported = existingSessionIds.has(sess.id);
              const speakers = Array.isArray(sess.speakers) ? sess.speakers : [];
              return (
                <Card key={sess.id} className="p-5 border-border/80 bg-card hover:border-primary/40 transition-colors space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {sess.startsAt && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {formatTimeDisplay(sess.startsAt, sess.endsAt)}
                          </span>
                        )}
                        {sess.room && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {sess.room}
                          </span>
                        )}
                        {sessionizeCategoryValues(sess.categories, "Language").map((lang) => (
                          <Badge key={`lang-${lang}`} variant="outline" className="text-[10px] text-muted-foreground">
                            <span className="sr-only">Language: </span>
                            {lang}
                          </Badge>
                        ))}
                        {sessionizeCategoryValues(sess.categories, "Level").map((level) => (
                          <Badge key={`level-${level}`} variant="outline" className="text-[10px] text-muted-foreground">
                            <span className="sr-only">Level: </span>
                            {level}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Sessionize #{sess.id}</Badge>
                        {sess.status && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {sess.status}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-foreground leading-snug">{sess.title}</h4>
                      {speakers.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {speakers.map((sp, spIdx) => (
                            <div key={sp.id || `spk-${spIdx}`} className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-full border border-border shrink-0">
                                <AvatarImage src={sp.profilePicture || undefined} />
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                  {(sp.name || "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                  {sp.name}
                                  {sp.linkedinUrl && (
                                    <a href={sp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                      <span className="sr-only"> — {sp.name}'s profile</span>
                                    </a>
                                  )}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {sp.jobTitle || sp.tagLine || "Speaker"}
                                  {sp.company ? ` · ${sp.company}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {sess.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pt-1">{sess.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 pt-2 md:pt-0">
                      {isImported ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant="outline" className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2.5 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                            Draft in workspace
                          </Badge>
                          <Button type="button" variant="ghost" size="sm" onClick={() => importOne(sess)} disabled={importingId === sess.id} className="h-7 text-[11px] text-muted-foreground hover:text-foreground">
                            {importingId === sess.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Update Info
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" size="sm" onClick={() => importOne(sess)} disabled={importingId === sess.id} className="h-8 text-xs font-semibold">
                          {importingId === sess.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
                          Import as Draft
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
  );
}

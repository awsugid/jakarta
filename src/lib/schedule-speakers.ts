import type { EventScheduleItem, ScheduleSpeaker } from "./types";

type LegacySpeakerFields = Pick<
  EventScheduleItem,
  "speakers" | "speakerId" | "speakerName" | "speakerRole" | "speakerCompany" | "speakerAvatar" | "speakerSocialUrl"
>;

/**
 * Resolve a schedule item's speakers from the `speakers` array, falling back to
 * the legacy singular fields when the array is absent (DB-only data).
 */
export function normalizeScheduleSpeakers(item: LegacySpeakerFields): ScheduleSpeaker[] {
  if (Array.isArray(item.speakers)) {
    return item.speakers.filter((s) => s && s.name && s.name.trim());
  }
  if (!item.speakerName) return [];
  return [
    {
      id: item.speakerId || undefined,
      name: item.speakerName,
      role: item.speakerRole || undefined,
      company: item.speakerCompany || undefined,
      avatar: item.speakerAvatar || undefined,
      socialUrl: item.speakerSocialUrl || undefined,
    },
  ];
}

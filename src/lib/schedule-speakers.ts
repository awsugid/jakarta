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
    return item.speakers
      .filter((s) => s && s.name && s.name.trim())
      .map((s) => ({
        ...s,
        avatar: s.avatar || s.avatarUrl || undefined,
        avatarUrl: s.avatarUrl || s.avatar || undefined,
      }));
  }
  if (!item.speakerName) return [];
  const av = item.speakerAvatar || undefined;
  return [
    {
      id: item.speakerId || undefined,
      name: item.speakerName,
      role: item.speakerRole || undefined,
      company: item.speakerCompany || undefined,
      avatar: av,
      avatarUrl: av,
      socialUrl: item.speakerSocialUrl || undefined,
    },
  ];
}

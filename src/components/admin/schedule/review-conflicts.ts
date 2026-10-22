import type { EventScheduleItem, ScheduleReviewConflict } from "@/lib/types";

export interface ConflictPresentation {
  heading: string;
  why: string;
}

/**
 * Map a backend review conflict to human, actionable copy. Unknown types or
 * unmapped details fall through with the backend detail verbatim so new
 * validation is never hidden from the organizer.
 */
export function presentConflict(conflict: ScheduleReviewConflict): ConflictPresentation {
  const detail = conflict.detail;
  switch (conflict.type) {
    case "missing-fields":
      if (detail.includes("has no room assignment")) {
        return {
          heading: "Choose a room",
          why: "This session is included in publication but has no room. Assign a room, or keep it as a draft.",
        };
      }
      if (detail.includes("unscheduled") || detail.includes("needs both startsAt and endsAt")) {
        return {
          heading: "Schedule this session",
          why: "This session is included in publication but has no start and end time. Add times, or keep it as a draft.",
        };
      }
      if (detail.includes("no active rooms")) {
        return {
          heading: "Add a room",
          why: "This session uses all rooms, but the event has no active rooms yet. Create a room first, then publish.",
        };
      }
      if (detail.includes("title is required")) {
        return {
          heading: "Name this session",
          why: "This session has no title yet. Add one, or keep it as a draft.",
        };
      }
      break;
    case "invalid-range":
      return {
        heading: "Fix the times",
        why: "The end time must come after the start time. Adjust the times so the session has a positive duration.",
      };
    case "unknown-format":
      return {
        heading: "Pick a talk format",
        why: "The saved talk format is missing or archived. Choose a format that is still active.",
      };
    case "unknown-speaker":
      return {
        heading: "Fix the speakers",
        why: "At least one speaker is missing from the directory. Re-pick the speakers for this session.",
      };
    case "unknown-room":
      return {
        heading: "Fix the rooms",
        why: "At least one assigned room is missing or archived. Re-assign the rooms for this session.",
      };
    case "room-overlap":
      return {
        heading: "Resolve the room clash",
        why: "Two sessions overlap in the same room. Move one to another room or another time.",
      };
    case "speaker-double-booking":
      return {
        heading: "Resolve the double booking",
        why: "A speaker is booked in two overlapping sessions. Move one session or swap the speaker.",
      };
  }
  return { heading: "Resolve this issue", why: detail };
}

/** Exact session title from the loaded draft, or a safe fallback naming the id. */
export function sessionTitle(items: EventScheduleItem[], id?: string | null): string | null {
  if (!id) return null;
  return items.find((it) => it.id === id)?.title ?? `Unknown session (id: ${id})`;
}

import type { DisplayScheduleSession } from "./schedule-calendar-helpers";

export interface LaneDefinition {
  id: string;
  name: string;
  subtitle: string;
}

export interface ActiveTipState {
  session: DisplayScheduleSession;
  left: number;
  top?: number;
  bottom?: number;
  isPinned: boolean;
}

export type ScheduleViewMode = "board" | "list";

export const STORAGE_KEY = "comday26_saved_sessions";
export const RULER_HEIGHT = 44; // Ruler height (px)
export const LANE_HEIGHT = 118; // Lane row height (px) — generous room for blocks + description
export const BLOCK_HEIGHT = 94; // Session block height (px) — displays title, time, and description
export const LABEL_WIDTH_DESKTOP = 140; // Sticky label column width desktop (px)
export const LABEL_WIDTH_MOBILE = 96; // Sticky label column width mobile (px)

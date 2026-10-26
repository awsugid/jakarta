import React from "react";
import { formatWibClock, formatMinutesToTime } from "./schedule-stage-helpers";
import { Maximize2, Minimize2, Eye, EyeOff, Play, Pause, Radio, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface StageOperatorBarProps {
  currentClock: Date;
  selectedRoom: string;
  onSelectRoom: (room: string) => void;
  distinctRooms: string[];
  isLive: boolean;
  onSnapToLive: () => void;
  minutesOfDay: number;
  onScrubMinutes: (minutes: number) => void;
  isTouring: boolean;
  onToggleTour: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onPrevSession: () => void;
  onNextSession: () => void;
  onQuickJump: (hhMm: string) => void;
  hidden: boolean;
  onToggleHidden: () => void;
}

export function StageOperatorBar({
  currentClock,
  selectedRoom,
  onSelectRoom,
  distinctRooms,
  isLive,
  onSnapToLive,
  minutesOfDay,
  onScrubMinutes,
  isTouring,
  onToggleTour,
  isFullscreen,
  onToggleFullscreen,
  onPrevSession,
  onNextSession,
  onQuickJump,
  hidden,
  onToggleHidden,
}: StageOperatorBarProps) {
  if (hidden) {
    return (
      <button
        onClick={onToggleHidden}
        title="Show Operator Bar (Press H)"
        className="fixed bottom-3 right-3 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all"
      >
        <Eye className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[96vw] max-w-5xl bg-[#1c1635]/90 border border-white/20 rounded-2xl p-3 shadow-2xl shadow-black/80 backdrop-blur-xl text-white select-none transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Clock & Snap to Live */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSnapToLive}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              isLive
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-orange-500 text-white hover:bg-orange-600 shadow-md animate-bounce"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isLive ? "LIVE WIB" : "SNAP TO LIVE"}</span>
          </button>
          <span className="font-mono text-sm font-bold text-slate-200">
            {formatWibClock(currentClock)}
          </span>
        </div>

        {/* Room Filter */}
        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/10 text-xs">
          <span className="text-slate-400 font-medium">Stage:</span>
          <select
            value={selectedRoom}
            onChange={(e) => onSelectRoom(e.target.value)}
            className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#1c1635]">All Stages (Plenary)</option>
            {distinctRooms.map((r) => (
              <option key={r} value={r} className="bg-[#1c1635]">
                {r === "800" ? "Room 800" : r}
              </option>
            ))}
          </select>
        </div>

        {/* Time Slider & Step Controls */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <button
            onClick={onPrevSession}
            title="Previous Session (Left Arrow)"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={480} // 08:00
            max={1020} // 17:00
            step={5}
            value={minutesOfDay}
            onChange={(e) => onScrubMinutes(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />

          <span className="font-mono text-xs font-semibold text-purple-300 min-w-[42px]">
            {formatMinutesToTime(minutesOfDay)}
          </span>

          <button
            onClick={onNextSession}
            title="Next Session (Right Arrow)"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jumps */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          <button onClick={() => onQuickJump("09:15")} className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">Keynote</button>
          <button onClick={() => onQuickJump("12:25")} className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">Lunch</button>
          <button onClick={() => onQuickJump("14:10")} className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 hover:bg-purple-500/50 font-bold">Felicia (14:05)</button>
          <button onClick={() => onQuickJump("14:35")} className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">Srinu (14:30)</button>
          <button onClick={() => onQuickJump("16:25")} className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">Closing</button>
        </div>

        {/* Action Toggles: Tour, Fullscreen, Hide */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleTour}
            title="Auto Tour Mode (Cycles sessions every 8s)"
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
              isTouring
                ? "bg-purple-600 border-purple-400 text-white animate-pulse"
                : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10"
            }`}
          >
            {isTouring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Tour</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen (F)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleHidden}
            title="Hide Bar (H)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

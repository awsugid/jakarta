import React, { useState } from "react";
import type { ScheduleSpeaker } from "@/lib/types";

interface SpeakerPortraitCutoutProps {
  speaker?: ScheduleSpeaker;
  className?: string;
}

export function SpeakerPortraitCutout({ speaker, className }: SpeakerPortraitCutoutProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const name = speaker?.name || "AWS Community Speaker";
  const avatarUrl = speaker?.avatar;

  // Masking styling achieving 1:1 feather blend with the stage floor
  const featherMaskStyle: React.CSSProperties = {
    maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 98%)",
    WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 98%)",
  };

  return (
    <div className={`relative flex items-end justify-center lg:justify-end ${className || ""}`}>
      {/* Radial backlight glow behind speaker head */}
      <div className="absolute top-1/4 right-1/4 w-[380px] h-[380px] bg-cyan-400/25 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[90px] pointer-events-none" />

      {avatarUrl && !imgFailed ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={featherMaskStyle}
          className="relative z-10 max-h-[82vh] max-w-full object-contain object-bottom drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-none pointer-events-none"
        />
      ) : (
        /* Majestic stylized fallback silhouette */
        <div
          style={featherMaskStyle}
          className="relative z-10 w-[420px] h-[520px] max-h-[75vh] flex flex-col items-center justify-end pb-12 bg-gradient-to-t from-purple-900/60 via-indigo-950/40 to-cyan-900/20 rounded-t-full border border-white/10"
        >
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-white/20 flex items-center justify-center shadow-2xl mb-6">
            <span className="text-6xl font-extrabold text-white/80 tracking-tight">
              {name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
          <span className="text-lg font-medium text-slate-300">{name}</span>
        </div>
      )}
    </div>
  );
}

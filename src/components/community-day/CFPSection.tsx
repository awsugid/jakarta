"use client";

import { useState } from "react";
import { Mic, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CommunityDayCfp } from "@/components/sessionize/CommunityDayCfp";
import { SESSIONIZE_CONFIG } from "@/lib/sessionize";

export function CFPSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section id="cfp" className="py-24 px-4 bg-background relative border-b border-border overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute right-0 top-1/4 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container max-w-6xl mx-auto space-y-20">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
            🎤 Call for Speakers
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Share Your Story at <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600">Community Day Jakarta</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mx-auto rounded-full" />
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Join the largest community-led developer conference in Indonesia. We welcome technical deep dives, architectural case studies, and hands-on guide proposals from both first-time speakers and seasoned experts.
          </p>
        </div>

        {/* Section 1: Tracks & Topics We Love (Full Width Deck) */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground/80 border-l-2 border-orange-500 pl-3">
              Tracks & Topics We Love
            </h3>
            <div className="h-px bg-border flex-1 hidden sm:block" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SESSIONIZE_CONFIG.tracks.map((track, idx) => (
              <div 
                key={`track-${idx}`} 
                className="flex flex-col justify-between p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-sm relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:bg-card/75 hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5 min-h-[220px]"
              >
                {/* Large Background Track Number */}
                <div className="absolute right-4 top-2 text-6xl font-extrabold font-mono text-orange-500/[0.06] select-none group-hover:text-orange-500/[0.08] transition-colors">
                  {`0${idx + 1}`}
                </div>
                
                {/* Content */}
                <div className="space-y-3 relative z-10">
                  <h4 className="font-semibold text-foreground text-base group-hover:text-orange-400 transition-colors">
                    {track.title}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {track.description}
                  </p>
                </div>
                
                {/* Tags List */}
                <div className="flex flex-wrap gap-1.5 pt-4 relative z-10">
                  {track.tags.map((tag, tagIdx) => (
                    <span 
                      key={tagIdx}
                      className="bg-orange-500/5 text-orange-400 border border-orange-500/10 text-xs px-2 py-0.5 rounded-md font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Embedded Reusable Sessionize CFP Component */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground/80 border-l-2 border-emerald-500 pl-3">
              Sessionize Application Call
            </h3>
            <div className="h-px bg-border flex-1 hidden sm:block" />
          </div>
          
          <CommunityDayCfp />
        </div>

      </div>
    </section>
  );
}


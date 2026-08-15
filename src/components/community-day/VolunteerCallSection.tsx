"use client";

import { Heart, Users, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VolunteerCallSection() {
  const roles = [
    {
      title: "Guest Experience & Registration",
      description: "Welcome attendees, manage check-in desks, distribute swags, and assist with guest inquiries.",
      icon: Users,
    },
    {
      title: "Technical Crew & AV Media",
      description: "Support session recording, live audio/video streaming, stage setup, and slide management.",
      icon: Sparkles,
    },
    {
      title: "Stage Management & Logistics",
      description: "Coordinate speaker timing, manage hall traffic, and ensure seamless transition between talks.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="volunteers" className="py-20 px-4 bg-background border-b border-border relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto space-y-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold uppercase tracking-widest">
            <Heart className="h-3.5 w-3.5 fill-sky-400 text-sky-400 animate-pulse" />
            Calling for Volunteers
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Be the Heart of <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500">AWS Community Day 2026</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 mx-auto rounded-full" />
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Want to build your network, gain hands-on event management experience, and give back to the tech ecosystem? We are looking for energetic volunteers to join our core event crew at BINUS Anggrek!
          </p>
        </div>

        {/* Volunteer Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, idx) => {
            const Icon = role.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-sm space-y-3 hover:border-sky-500/30 transition-all"
              >
                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl w-12 h-12 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">{role.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Card */}
        <div className="bg-gradient-to-br from-sky-950/30 via-card/80 to-indigo-950/30 border border-sky-500/20 rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground">Ready to Join Our Crew?</h3>
            <p className="text-muted-foreground text-sm">
              Applications are reviewed on a rolling basis. Free event access, volunteer merch, certificate of contribution, and organizer meal perks included.
            </p>
          </div>

          <div>
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold px-8 py-6 rounded-2xl shadow-lg shadow-sky-500/20 gap-2 text-base"
            >
              <a href="/volunteer">
                Apply as Volunteer
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}

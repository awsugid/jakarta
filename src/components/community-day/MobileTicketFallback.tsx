import React, { useState } from "react";
import { Ticket, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileTicketFallbackProps {
  eventUrl: string;
}

export function MobileTicketFallback({ eventUrl }: MobileTicketFallbackProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="space-y-6">
      {!imageError ? (
        <div className="overflow-hidden rounded-3xl border border-border dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl relative aspect-video flex items-center justify-center">
          <img
            src="/get-tickets.jpeg"
            alt="AWS Community Day Registration Preview"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="rounded-3xl border border-border dark:border-white/10 bg-card/60 backdrop-blur-xl p-8 text-center space-y-4 shadow-xl flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-primary/10 text-primary rounded-full mb-2">
            <Ticket className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground">AWS Community Day Tickets</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Get ready for a day of technical sessions, hands-on labs, and cloud networking. Secure your spot on our registration portal.
          </p>
        </div>
      )}
      
      <div className="text-center px-2">
        <Button
          asChild
          size="lg"
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold tracking-wide shadow-lg shadow-orange-500/20 active:scale-95 transition-all py-6 rounded-xl text-base"
        >
          <a href={eventUrl} target="_blank" rel="noopener noreferrer">
            🎟️ Register & Get Tickets <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

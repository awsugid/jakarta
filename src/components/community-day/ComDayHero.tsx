import { useState, useEffect } from "react";
import { Calendar, MapPin, Ticket, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface ComDayHeroProps {
  kioskUrl?: string;
}

export function ComDayHero({ kioskUrl }: ComDayHeroProps) {
  const targetDate = "2026-10-31T09:00:00+07:00";
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="overview" className="relative min-h-[85vh] flex items-center justify-center pt-24 sm:pt-28 pb-16 px-4 overflow-hidden bg-background">

      {/* Immich Event Preview Background Carousel */}
      <ImmichKioskBackground kioskUrl={kioskUrl} albumId="0c7e9c9e-d2f4-423f-a9d6-4b3caa8bb0a5" />

      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(120,119,198,0.26),rgba(255,255,255,0))]" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-950/20 rounded-full blur-[128px]" />

      <div className="container max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Heading & CTAs */}
        <div className="lg:col-span-7 text-center lg:text-left space-y-8 animate-in fade-in duration-700">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            🎤 Share Your Story at Community Day Jakarta — Sessionize
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            AWS Community Day <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
              Jakarta 2026
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground font-normal leading-relaxed max-w-2xl">
            Join the largest community-led gathering of cloud builders in Indonesia. Dive into deep technical content, professional networking, and interactive hands-on experiences.
          </p>

          {/* Date & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 pt-4">
            <div className="flex items-center space-x-3 bg-card/70 backdrop-blur-md border border-border rounded-xl p-3.5">
              <Calendar className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="text-left text-sm">
                <p className="font-semibold text-foreground">October 31, 2026</p>
                <p className="text-muted-foreground text-xs">08:30 - 17:00 WIB</p>
              </div>
            </div>
            <a 
              href="https://maps.app.goo.gl/B5sKfT9QCf4Bdzsx9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 bg-card/70 backdrop-blur-md border border-border rounded-xl p-3.5 hover:bg-accent transition-colors group"
            >
              <MapPin className="h-5 w-5 text-pink-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left text-sm">
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Binus @Anggrek</p>
                <p className="text-muted-foreground text-xs">Auditorium, Jakarta Barat</p>
              </div>
            </a>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-primary-foreground font-bold tracking-wide shadow-lg shadow-orange-500/25 active:scale-95 transition-all py-6 px-8 rounded-xl"
            >
              <a href="https://sessionize.com/AWSComDayJakarta26/" target="_blank" rel="noopener noreferrer">
                <Mic className="mr-2 h-5 w-5" /> Share Your Story
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border bg-card text-foreground hover:bg-accent hover:border-border font-medium py-6 px-8 rounded-xl"
            >
              <a href="#tickets">
                <Ticket className="mr-2 h-5 w-5" /> Get Tickets
              </a>
            </Button>
          </div>
        </div>

        {/* Right Column: Countdown Box */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end animate-in fade-in duration-700 delay-200">
          <div className="w-full max-w-sm bg-card/70 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Event Starts In
            </h3>

            {!isExpired ? (
              <div className="grid grid-cols-4 gap-3">
                {/* Days */}
                <div className="flex flex-col items-center">
                  <div className="w-full bg-muted border border-border/50 rounded-xl py-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    {timeLeft.days.toString().padStart(2, "0")}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium mt-2">Days</span>
                </div>
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <div className="w-full bg-muted border border-border/50 rounded-xl py-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    {timeLeft.hours.toString().padStart(2, "0")}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium mt-2">Hours</span>
                </div>
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="w-full bg-muted border border-border/50 rounded-xl py-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    {timeLeft.minutes.toString().padStart(2, "0")}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium mt-2">Mins</span>
                </div>
                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <div className="w-full bg-muted border border-border/50 rounded-xl py-3 text-3xl sm:text-4xl font-bold text-orange-500 tracking-tight animate-pulse">
                    {timeLeft.seconds.toString().padStart(2, "0")}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium mt-2">Secs</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                🎉 Event Live!
              </div>
            )}

            <div className="pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span>🎟️ Ticket sales closing soon</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

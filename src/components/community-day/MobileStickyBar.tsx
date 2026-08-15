import { useState, useEffect } from "react";
import { Ticket, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileStickyBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // Show sticky bar after scrolling past the main hero height (approx 400px)
      // and hide when near the bottom so it doesn't obscure FAQ or footer content
      const isPastHero = scrollPosition > 400;
      const isNearBottom = windowHeight + scrollPosition >= fullHeight - 120;

      if (isPastHero && !isNearBottom) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] bg-background/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-border dark:border-white/10 shadow-2xl flex items-center justify-between sm:hidden transition-all duration-300 animate-slide-in">
      <div className="flex flex-col text-left">
        <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">AWS Community Day</span>
        <span className="text-xs font-semibold text-foreground dark:text-white">Share Your Story</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5"
        >
          <a href="https://sessionize.com/AWSComDayJakarta26/" target="_blank" rel="noopener noreferrer">
            <Mic className="h-4 w-4" /> Share Story
          </a>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="text-xs py-2 px-2.5 rounded-lg flex items-center gap-1 border-border/80"
        >
          <a href="#tickets" title="Get Tickets">
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </a>
        </Button>
      </div>
    </div>
  );
}

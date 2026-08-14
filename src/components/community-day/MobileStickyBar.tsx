import { useState, useEffect } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileStickyBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling past the main hero height (approx 400px)
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTickets = () => {
    const element = document.getElementById("tickets");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-border dark:border-white/10 shadow-2xl flex items-center justify-between sm:hidden transition-all duration-300 animate-slide-in">
      <div className="flex flex-col text-left">
        <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">AWS Community Day</span>
        <span className="text-xs font-semibold text-foreground dark:text-white">Tickets Available</span>
      </div>
      <Button
        size="sm"
        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-xs py-5 px-5 rounded-lg flex items-center gap-1.5"
        onClick={handleScrollToTickets}
      >
        <Ticket className="h-4 w-4" /> Get Tickets
      </Button>
    </div>
  );
}

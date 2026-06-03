import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  items: { name: string; href: string }[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="relative z-50"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-4 top-4 z-50 text-white/70 hover:text-white"
            >
              <X className="h-8 w-8" />
            </Button>
            <nav className="flex flex-col items-center gap-8 text-center p-6 w-full max-w-lg">
              {items.map((item) => {
                const isActive =
                  currentPath === item.href ||
                  currentPath === `${item.href}/` ||
                  (item.href !== "/" && currentPath.startsWith(item.href));
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`text-3xl font-bold tracking-tight transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-white/90 hover:text-[#FF9900]"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}

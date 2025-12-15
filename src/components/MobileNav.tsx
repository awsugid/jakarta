import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
    items: { name: string; href: string }[];
}

export function MobileNav({ items }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
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

            {open && (
                <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    <nav className="flex flex-col items-center gap-8 text-center p-6 w-full max-w-lg">
                        {items.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="text-3xl font-bold tracking-tight text-white/90 transition-colors hover:text-[#FF9900]"
                                onClick={() => setOpen(false)}
                            >
                                {item.name}
                            </a>
                        ))}
                        <div className="w-16 h-1 bg-white/10 rounded-full" />
                        <a
                            href="https://chat.whatsapp.com/C419AmS9nVQ2H4O9oQW8P9"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl font-medium text-[#FF9900] hover:text-[#FF9900]/80 hover:underline underline-offset-4"
                            onClick={() => setOpen(false)}
                        >
                            Join Community
                        </a>
                    </nav>
                </div>
            )}
        </div>
    );
}

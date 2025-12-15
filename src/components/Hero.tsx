import React from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
    return (
        <section className="relative overflow-hidden py-24 lg:py-40 bg-background">
            <div className="container mx-auto relative z-10 flex flex-col items-center text-center px-4 md:px-6">
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
                    <Badge variant="outline" className="mb-6 py-1.5 px-4 text-sm backdrop-blur-sm bg-background/50 border-muted-foreground/20">
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                        Official AWS User Group
                    </Badge>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
                    AWS User Group <span className="text-primary">Jakarta</span>
                </h1>

                <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
                    Join Indonesia's largest community of AWS builders. Learn, share, and connect with fellow developers, architects, and cloud enthusiasts.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both w-full sm:w-auto">
                    <Button
                        asChild
                        size="lg"
                        className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-500/20"
                    >
                        <a href="https://chat.whatsapp.com/C419AmS9nVQ2H4O9oQW8P9" target="_blank" rel="noopener noreferrer">
                            <Users className="mr-2 h-5 w-5" />
                            Join Community
                        </a>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="h-12 px-8 text-base border-input bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground shadow-sm"
                    >
                        <a href="/events">
                            <Calendar className="mr-2 h-5 w-5" />
                            See Upcoming Events
                        </a>
                    </Button>
                </div>
            </div>

            {/* Dynamic Background Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-primary/10 rounded-full blur-[100px] -z-10 opacity-40 animate-pulse duration-[5000ms]" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -z-10 opacity-30" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[90px] -z-10 opacity-30" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 pointer-events-none"></div>
        </section>
    );
}


import React from 'react';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Event {
    slug: string;
    data: {
        title: string;
        date: Date;
        location: string;
        description: string;
        type: string;
        registrationUrl?: string;
    };
}

interface EventListProps {
    events: Event[];
}

export function EventList({ events }: EventListProps) {
    return (
        <section className="py-24 bg-muted/30" id="events">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row mb-12">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl text-foreground">Upcoming Events</h2>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Check out what's happening next in our community.
                        </p>
                    </div>
                    <Button variant="ghost" className="hidden md:inline-flex text-primary hover:text-primary/80" asChild>
                        <a href="/events">
                            View all events
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <Card key={event.slug} className="group relative flex flex-col justify-between border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card">
                            <CardHeader className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none transition-colors">
                                        {event.data.type}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                                    <a href={`/events/${event.slug}`} className="focus:outline-none">
                                        <span className="absolute inset-0" aria-hidden="true" />
                                        {event.data.title}
                                    </a>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                        <Calendar className="mr-2 h-4 w-4 text-primary/70" />
                                        {new Date(event.data.date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="flex items-center">
                                        <MapPin className="mr-2 h-4 w-4 text-primary/70" />
                                        {event.data.location}
                                    </div>
                                </div>
                                <CardDescription className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                    {event.data.description}
                                </CardDescription>
                            </CardContent>
                            <CardFooter className="pt-4 border-t border-border/50 flex items-center justify-between">
                                <span className="text-sm font-medium text-primary group-hover:underline underline-offset-4">Register Now</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-300" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-10 text-center md:hidden">
                    <Button variant="link" className="text-primary" asChild>
                        <a href="/events">
                            View all events <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    );
}

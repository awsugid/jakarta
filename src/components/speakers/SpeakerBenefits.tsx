import React from 'react';
import { Presentation, Clock, Layers, Users, Video, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const talkFormats = [
    {
        icon: Presentation,
        name: "Standard Talk",
        duration: "30-45 minutes",
        description: "Present a topic in depth to an audience of 100-200 AWS enthusiasts. Ideal for technical deep dives, architecture reviews, or case studies.",
        skills: ["Technical Expertise", "Slide Design", "Q&A"],
    },
    {
        icon: Clock,
        name: "Lightning Talk",
        duration: "10-15 minutes",
        description: "Quick, focused presentations perfect for sharing tips, tools, lessons learned, or introducing a new AWS service.",
        skills: ["Conciseness", "Storytelling", "Impact"],
    },
    {
        icon: Layers,
        name: "Workshop / Hands-on",
        duration: "60-90 minutes",
        description: "Interactive sessions where attendees follow along with live demos or exercises. Great for tutorials and guided labs.",
        skills: ["Preparation", "Live Demo", "Mentoring"],
    },
    {
        icon: Users,
        name: "Panel Discussion",
        duration: "45-60 minutes",
        description: "Join a panel of experts to discuss trending topics, share perspectives, and answer audience questions in a conversational format.",
        skills: ["Domain Knowledge", "Communication", "Collaboration"],
    },
    {
        icon: Video,
        name: "Remote / Virtual Talk",
        duration: "Flexible",
        description: "Can't make it in person? We regularly host hybrid and virtual meetups. Present from anywhere and reach our entire community online.",
        skills: ["Virtual Setup", "Engagement", "Adaptability"],
    },
    {
        icon: Globe,
        name: "Community Day Keynote",
        duration: "30-45 minutes",
        description: "Take the main stage at our larger community day events. These are flagship sessions with broader reach and higher visibility.",
        skills: ["Stage Presence", "Thought Leadership", "Inspiration"],
    },
];

export function SpeakerBenefits() {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
                        Talk Formats We Offer
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        We offer a variety of speaking formats to match your style and experience level.
                        Whether it's your first talk or your fiftieth, there's a format for you.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {talkFormats.map((format) => (
                        <Card
                            key={format.name}
                            className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card"
                        >
                            <CardHeader className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                        <format.icon className="h-6 w-6" />
                                    </div>
                                    <Badge variant="secondary" className="text-xs bg-secondary/80">
                                        {format.duration}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                                    {format.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                                    {format.description}
                                </CardDescription>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Skills You'll Showcase</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {format.skills.map((skill) => (
                                            <span key={skill} className="text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

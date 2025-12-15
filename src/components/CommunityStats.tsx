import React from 'react';
import { Users, Calendar, Mic, Mail, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CommunityStats() {
    const stats = [
        {
            label: "Community Members",
            value: "4,000+",
            icon: Users,
            description: "Active builders and enthusiasts"
        },
        {
            label: "Events Hosted",
            value: "50+",
            icon: Calendar,
            description: "Meetups, workshops, and community days"
        },
        {
            label: "Speakers",
            value: "100+",
            icon: Mic,
            description: "Technical experts shared their knowledge"
        }
    ];

    return (
        <section className="py-24 bg-background relative" id="stats">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
                        Growing Stronger Together
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Join Indonesia's largest active AWS community. We are dedicated to helping developers learn, build, and connect.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-8 md:grid-cols-3 mb-24">
                    {stats.map((stat, index) => (
                        <Card key={index} className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
                            <CardContent className="p-8 flex flex-col items-center text-center">
                                <div className="mb-4 p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <stat.icon className="h-8 w-8" />
                                </div>
                                <h3 className="text-4xl font-extrabold tracking-tight mb-2 text-foreground">
                                    {stat.value}
                                </h3>
                                <div className="text-lg font-semibold text-muted-foreground mb-1">
                                    {stat.label}
                                </div>
                                <p className="text-sm text-muted-foreground/80">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Collaboration CTA */}
                <Card className="relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background text-center md:text-left shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10"></div>

                    <CardContent className="p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="max-w-xl space-y-4 text-center lg:text-left">
                            <h3 className="text-3xl font-bold text-foreground">Partner with AWS UG Jakarta</h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Connect with thousands of cloud professionals. Whether you want to speak, host an event, or sponsor our community, we'd love to collaborate.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <Button
                                asChild
                                size="lg"
                                className="h-14 px-8 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-xl"
                            >
                                <a href="mailto:organizers@awsugjakarta.id">
                                    <Mail className="mr-2 h-5 w-5" />
                                    Contact Organizers
                                </a>
                            </Button>
                        </div>
                    </CardContent>

                    {/* Glossy overlay effect */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
                </Card>
            </div>
        </section>
    );
}

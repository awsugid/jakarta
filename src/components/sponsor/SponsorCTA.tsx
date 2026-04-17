import React from 'react';
import { Mail, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SponsorCTA() {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background text-center md:text-left shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10"></div>

                    <CardContent className="p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="max-w-xl space-y-4 text-center lg:text-left">
                            <h3 className="text-3xl font-bold text-foreground">
                                Let's Build Something Great Together
                            </h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Ready to collaborate? Reach out to our organizing team and let's discuss how we can create mutual value for your organization and our community.
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
                                    Email Us
                                </a>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="h-14 px-8 text-base font-medium rounded-full border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground"
                            >
                                <a href="#">
                                    <Download className="mr-2 h-5 w-5" />
                                    Sponsorship Deck
                                </a>
                            </Button>
                        </div>
                    </CardContent>

                    {/* Glossy overlay effect */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[250px] h-[250px] bg-blue-500/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
                </Card>
            </div>
        </section>
    );
}

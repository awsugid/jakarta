import React from 'react';
import { Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Sponsors() {
    return (
        <section className="py-24 bg-background relative" id="sponsors">
            <div className="container mx-auto text-center relative z-10 px-4 md:px-6">
                <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">Supported By</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-16 text-lg">
                    We are proud to collaborate with these amazing organizations who make our community possible.
                </p>

                {/* Logos Grid */}
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 items-center mb-24">
                    {['AWS', 'Packt', "O'Reilly", 'Manning'].map((sponsor) => (
                        <Card key={sponsor} className="group flex items-center justify-center p-8 h-32 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 shadow-sm hover:shadow-md">
                            <span className="font-bold text-2xl text-muted-foreground/50 group-hover:text-primary transition-colors">
                                {sponsor}
                            </span>
                        </Card>
                    ))}
                </div>

                {/* Call to Action Card with Glass Effect */}
                <Card className="relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background text-center md:text-left shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10"></div>

                    <CardContent className="p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="max-w-xl space-y-4">
                            <h3 className="text-3xl font-bold text-foreground">Want to support the community?</h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                We are always looking for partners to help us host events, provide speakers, or sponsor our community days. Let's build something great together.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Button
                                asChild
                                size="lg"
                                className="h-14 px-8 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-xl"
                            >
                                <a href="mailto:organizers@awsugjakarta.id">
                                    <Mail className="mr-2 h-5 w-5" />
                                    Become a Sponsor
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

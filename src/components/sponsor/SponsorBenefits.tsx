import React from 'react';
import { Target, Eye, UserCheck, Heart, FileText, Globe } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
    {
        icon: Target,
        title: "Direct Access to Cloud Professionals",
        description: "Reach 4,000+ active AWS practitioners, developers, and architects in the Jakarta region.",
    },
    {
        icon: Eye,
        title: "Brand Visibility",
        description: "Logo placement on our website, event materials, social media channels, and merchandise.",
    },
    {
        icon: UserCheck,
        title: "Talent Pipeline",
        description: "Connect with skilled developers, solutions architects, and cloud engineers actively building on AWS.",
    },
    {
        icon: Heart,
        title: "Community Goodwill",
        description: "Demonstrate your commitment to the local tech ecosystem and earn genuine community appreciation.",
    },
    {
        icon: FileText,
        title: "Content Co-Creation",
        description: "Collaborate on workshops, blog posts, technical content, and knowledge-sharing initiatives.",
    },
    {
        icon: Globe,
        title: "AWS Ecosystem Connection",
        description: "Be part of the official AWS User Group network in Southeast Asia and the global community.",
    },
];

export function SponsorBenefits() {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
                        Why Partner with AWS UG Jakarta?
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Partnering with our community delivers tangible value for your brand and organization.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {benefits.map((benefit) => (
                        <Card
                            key={benefit.title}
                            className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card"
                        >
                            <CardContent className="p-8 flex flex-col items-center text-center">
                                <div className="mb-4 p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <benefit.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">
                                    {benefit.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {benefit.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

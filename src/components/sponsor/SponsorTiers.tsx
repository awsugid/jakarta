import React from 'react';
import { Building, Coffee, Gift, Wallet, Mic2, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tiers = [
    {
        icon: Building,
        name: "Venue Sponsor",
        badge: "Popular",
        description: "Provide a venue for our monthly meetups with capacity for 100-200 attendees, projector/screen, and reliable WiFi. Your logo will be displayed at the event and on our website.",
        benefits: ["Logo on event page", "On-site branding", "Shoutout during event"],
    },
    {
        icon: Coffee,
        name: "Food & Beverage Sponsor",
        badge: null,
        description: "Sponsor food and drinks for attendees during networking sessions. Great brand visibility during the most social and engaging part of every event.",
        benefits: ["Brand visibility", "Networking opportunity", "Social media mention"],
    },
    {
        icon: Gift,
        name: "Swag & Merchandise Sponsor",
        badge: null,
        description: "Provide branded merchandise, stickers, t-shirts, or other items for attendees. Your brand travels with our community members wherever they go.",
        benefits: ["Extended brand reach", "Attendee goodwill", "Social media shares"],
    },
    {
        icon: Wallet,
        name: "Financial Sponsor",
        badge: "Premium",
        description: "Direct financial support for event operations, infrastructure, and community growth. Includes premium logo placement and dedicated shoutouts at every event.",
        benefits: ["Premium logo placement", "Dedicated shoutout", "Priority consideration"],
    },
    {
        icon: Mic2,
        name: "Content & Speaker Sponsor",
        badge: "Recommended",
        description: "Provide expert speakers for our events or co-host specialized workshops. Position your company as a thought leader in the AWS ecosystem.",
        benefits: ["Thought leadership", "Expert positioning", "Co-branded content"],
    },
    {
        icon: Share2,
        name: "Media & Promotion Partner",
        badge: null,
        description: "Help amplify our events through your channels. Cross-promotion benefits for both communities and expanded reach for all involved.",
        benefits: ["Cross-promotion", "Audience expansion", "Community growth"],
    },
];

export function SponsorTiers() {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
                        Collaboration Opportunities
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        There are many ways to partner with AWS User Group Jakarta.
                        Choose the collaboration model that works best for your organization.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.name}
                            className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card"
                        >
                            <CardHeader className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                        <tier.icon className="h-6 w-6" />
                                    </div>
                                    {tier.badge && (
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-xs">
                                            {tier.badge}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                                    {tier.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                                    {tier.description}
                                </CardDescription>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">What You Get</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tier.benefits.map((benefit) => (
                                            <span key={benefit} className="text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                                                {benefit}
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

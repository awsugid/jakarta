import React, { useState } from 'react';
import { Mic, Mail, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function SpeakerNotify() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type: 'speakers' }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmitted(true);
            }
        } catch {
            // Silently fail — user can retry
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <Card className="relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background text-center md:text-left shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10"></div>

                    <CardContent className="p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="max-w-xl space-y-4 text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                                <Mic className="h-6 w-6 text-primary" />
                                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Stay Updated</span>
                            </div>
                            <h3 className="text-3xl font-bold text-foreground">
                                Subscribe to Speaker Announcements
                            </h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Join our speaker mailing list and we'll let you know the moment a
                                Call for Speakers window opens, including which roles are available.
                            </p>
                        </div>

                        <div className="w-full lg:w-auto lg:min-w-[380px] shrink-0">
                            {submitted ? (
                                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-primary/10 border border-primary/20">
                                    <CheckCircle className="h-10 w-10 text-primary" />
                                    <p className="text-lg font-semibold text-foreground">You're on the list!</p>
                                    <p className="text-sm text-muted-foreground text-center">
                                        We'll email you when the call for speakers opens. Thank you for your interest!
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12 px-4 text-base bg-background/80 border-border/50 focus:border-primary/50"
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={loading || !email}
                                        className="h-12 px-8 text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-orange-500/20 shrink-0"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                Submitting...
                                            </span>
                                        ) : (
                                            <>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Notify Me
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </CardContent>

                    {/* Glossy overlay effect */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[300px] h-[300px] bg-primary/20 rounded-full blur-3xl opacity-40 pointer-events-none"></div>
                </Card>
            </div>
        </section>
    );
}

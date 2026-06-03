import React from "react";
import {
  Presentation,
  Clock,
  Layers,
  Users,
  Video,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FormInfo } from "@/lib/types";

// Customize each talk format below:
// - `isOpen`: set to true when CFP is actively accepting submissions for this format
// - `slotsNeeded`: number of speaker slots currently available (0 = not hiring)
type TalkFormat = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  duration: string;
  description: string;
  skills: string[];
  isOpen: boolean;
  slotsNeeded: number;
};

interface SpeakerBenefitsProps {
  forms?: FormInfo[];
  onApply?: (slug: string, title: string) => void;
}

const talkFormats: TalkFormat[] = [
  {
    icon: Presentation,
    name: "Standard Talk",
    duration: "30-45 minutes",
    description:
      "Present a topic in depth to an audience of 100-200 AWS enthusiasts. Ideal for technical deep dives, architecture reviews, or case studies.",
    skills: ["Technical Expertise", "Slide Design", "Q&A"],
    isOpen: false,
    slotsNeeded: 0,
  },
  {
    icon: Clock,
    name: "Lightning Talk",
    duration: "10-15 minutes",
    description:
      "Quick, focused presentations perfect for sharing tips, tools, lessons learned, or introducing a new AWS service.",
    skills: ["Conciseness", "Storytelling", "Impact"],
    isOpen: false,
    slotsNeeded: 0,
  },
  {
    icon: Layers,
    name: "Workshop / Hands-on",
    duration: "60-90 minutes",
    description:
      "Interactive sessions where attendees follow along with live demos or exercises. Great for tutorials and guided labs.",
    skills: ["Preparation", "Live Demo", "Mentoring"],
    isOpen: false,
    slotsNeeded: 0,
  },
  {
    icon: Users,
    name: "Panel Discussion",
    duration: "45-60 minutes",
    description:
      "Join a panel of experts to discuss trending topics, share perspectives, and answer audience questions in a conversational format.",
    skills: ["Domain Knowledge", "Communication", "Collaboration"],
    isOpen: false,
    slotsNeeded: 0,
  },
  {
    icon: Video,
    name: "Remote / Virtual Talk",
    duration: "Flexible",
    description:
      "Can't make it in person? We regularly host hybrid and virtual meetups. Present from anywhere and reach our entire community online.",
    skills: ["Virtual Setup", "Engagement", "Adaptability"],
    isOpen: false,
    slotsNeeded: 0,
  },
  {
    icon: Globe,
    name: "Community Day Keynote",
    duration: "30-45 minutes",
    description:
      "Take the main stage at our larger community day events. These are flagship sessions with broader reach and higher visibility.",
    skills: ["Stage Presence", "Thought Leadership", "Inspiration"],
    isOpen: false,
    slotsNeeded: 0,
  },
];

export function SpeakerBenefits({ forms, onApply }: SpeakerBenefitsProps) {
  // If we have backend forms, render dynamic cards
  if (forms && forms.length > 0) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
              Open Talk Formats
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Choose a format below to apply. Each format has its own
              application form — pick the one that best fits your proposed talk.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => {
              // Try to match with a hardcoded format for icon/duration/skills
              const matched = talkFormats.find(
                (f) => f.name.toLowerCase().replace(/\s+/g, "-") === form.slug,
              );
              const Icon = matched?.icon || Presentation;
              return (
                <Card
                  key={form.slug}
                  className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      {matched && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-secondary/80"
                        >
                          {matched.duration}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                      {form.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {form.is_active ? (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Open Now
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground border-muted-foreground/20"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Closed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {form.description ? (
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                        {form.description}
                      </CardDescription>
                    ) : matched ? (
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                        {matched.description}
                      </CardDescription>
                    ) : null}

                    {matched && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                          Skills You'll Showcase
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matched.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.is_active && onApply && (
                      <Button
                        onClick={() => onApply(form.slug, form.title)}
                        className="w-full mt-2"
                        variant="default"
                      >
                        Apply for {form.title}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Fallback: static hardcoded talk formats
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
            Talk Formats We Offer
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We offer a variety of speaking formats to match your style and
            experience level. Whether it's your first talk or your fiftieth,
            there's a format for you.
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
                  <Badge
                    variant="secondary"
                    className="text-xs bg-secondary/80"
                  >
                    {format.duration}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                  {format.name}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className="text-xs bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Open Now
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {format.description}
                </CardDescription>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Skills You'll Showcase
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {format.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {onApply && (
                  <Button
                    onClick={() => {
                      const slug = format.name
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[/]/g, "-");
                      onApply(slug, format.name);
                    }}
                    className="w-full mt-2"
                    variant="default"
                  >
                    Apply for {format.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FormInfo } from "@/lib/types";
import { divisions, nameToSlug } from "@/data/volunteer-divisions";

export { divisions, nameToSlug };

interface VolunteerRolesProps {
  forms?: FormInfo[];
  onApply?: (slug: string, title: string) => void;
}


export function VolunteerRoles({ forms, onApply }: VolunteerRolesProps) {
  // Build a lookup from slug to FormInfo
  const formBySlug = new Map<string, FormInfo>();
  if (forms) {
    for (const f of forms) {
      formBySlug.set(f.slug, f);
    }
  }

  return (
    <section id="volunteer-roles" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
            {"Volunteer Divisions & Roles"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Explore the different teams that keep AWS User Group Jakarta
            running. Each division plays a vital role in delivering great
            experiences for our community.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {divisions.map((division) => (
            <Card
              key={division.name}
              className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 bg-card"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <division.icon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200">
                  {division.name}
                </CardTitle>
                {/* Status badge from backend form data, or default to Open */}
                {(() => {
                  const slug = nameToSlug[division.name];
                  const form = slug ? formBySlug.get(slug) : undefined;
                  const isActive = !!form?.is_active;
                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isActive ? (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Open
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
                  );
                })()}
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {division.description}
                </CardDescription>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Key Responsibilities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {division.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="text-xs bg-secondary/80"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Skills You'll Gain
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {division.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md"
                      >
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

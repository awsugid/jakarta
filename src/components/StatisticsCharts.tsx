"use client";

import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { fetchCommunityStatistics } from "@/lib/api";
import type { CommunityStatistics } from "@/lib/types";

interface StatisticsChartsProps {}

// Chart configurations matching reference design
const participantsConfig = {
  total: {
    label: "Participants",
    color: "hsl(36 100% 50%)", // Primary orange
  },
} satisfies ChartConfig;

const eventsConfig = {
  total: {
    label: "Events",
    color: "hsl(36 100% 50%)", // Primary orange
  },
} satisfies ChartConfig;

const genderConfig = {
  male: {
    label: "Male",
    color: "hsl(36 100% 50%)", // Primary orange
  },
  female: {
    label: "Female",
    color: "hsl(186 100% 42%)", // Teal
  },
} satisfies ChartConfig;

const backgroundConfig = {
  professional: {
    label: "Professional",
    color: "hsl(36 100% 50%)", // Primary orange
  },
  student: {
    label: "Student",
    color: "hsl(186 100% 42%)", // Teal
  },
} satisfies ChartConfig;

const positionConfig = {
  count: {
    label: "Attendees",
    color: "hsl(36 100% 50%)",
  },
} satisfies ChartConfig;

const companyConfig = {
  count: {
    label: "Attendees",
    color: "hsl(36 100% 50%)",
  },
} satisfies ChartConfig;

// Colors matching the reference design
const CHART_COLORS = {
  orange: "hsl(36 100% 50%)", // AWS Orange
  teal: "hsl(186 100% 42%)", // Professional Teal/Cyan
};

export function StatisticsCharts({}: StatisticsChartsProps = {}) {
  const [data, setData] = useState<CommunityStatistics | null>(null);
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCommunityStatistics()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Delay chart rendering slightly to improve perceived performance
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isLoading = !data || !isLoaded;

  // Transform gender data for pie chart
  const genderData = [
    {
      name: "male",
      value: data?.participantGenderDistributionLastYear.male ?? 0,
    },
    {
      name: "female",
      value: data?.participantGenderDistributionLastYear.female ?? 0,
    },
  ];

  // Transform background data for pie chart
  const backgroundData = [
    {
      name: "professional",
      value: data?.participantBackgroundDistribution.professional ?? 0,
    },
    {
      name: "student",
      value: data?.participantBackgroundDistribution.student ?? 0,
    },
  ];

  // Live current-year metrics (may be empty when Pretix unavailable)
  const genderThisYear = data?.participantGenderDistributionThisYear ?? {
    male: 0,
    female: 0,
  };
  const hasGenderThisYear =
    genderThisYear.male > 0 || genderThisYear.female > 0;
  const genderThisYearData = [
    { name: "male", value: genderThisYear.male },
    { name: "female", value: genderThisYear.female },
  ];

  const positionData = data?.positionDistributionThisYear ?? [];

  const companyData = (data?.topCompaniesThisYear ?? [])
    .slice(0, 10)
    .map((c) => ({
      ...c,
      label: c.label.length > 20 ? c.label.slice(0, 20) + "…" : c.label,
    }));

  const awsExperience = data?.avgAwsExperienceYears ?? null;
  const awsExperienceData = data?.awsExperienceDistributionThisYear ?? [];
  const ageData = data?.ageDistributionThisYear ?? [];
  const awsExperienceConfig = {
    count: {
      label: "Participants",
      color: "hsl(36 100% 50%)",
    },
  } satisfies ChartConfig;
  const ageConfig = {
    count: {
      label: "Participants",
      color: "hsl(36 100% 50%)",
    },
  } satisfies ChartConfig;

  if (error) {
    return (
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="max-w-md mx-auto border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-10 text-center text-muted-foreground">
              Community statistics unavailable. Please try again later.
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground lg:text-4xl">
            Community Growth and Demographics
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Watch our community flourish year after year with increasing
            participation and engagement.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Current-year metrics update hourly from Pretix.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Participants Line Chart */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">
                Participant Growth
              </CardTitle>
              <CardDescription>Total participants per year</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={participantsConfig}>
                  <LineChart
                    data={data?.participantNumOfTheYear ?? []}
                    margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={CHART_COLORS.orange}
                      strokeWidth={3}
                      dot={{
                        fill: CHART_COLORS.orange,
                        strokeWidth: 2,
                        r: 6,
                      }}
                      activeDot={{ r: 8 }}
                      label={{
                        position: "top",
                        fill: "rgba(255,255,255,0.9)",
                        fontSize: 12,
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Events Bar Chart */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">Event Frequency</CardTitle>
              <CardDescription>Total events per year</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={eventsConfig}>
                  <BarChart
                    data={data?.eventPerYear ?? []}
                    margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="total"
                      fill={CHART_COLORS.orange}
                      radius={[4, 4, 0, 0]}
                      label={{
                        position: "top",
                        fill: "rgba(255,255,255,0.9)",
                        fontSize: 12,
                      }}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Age Distribution — current year from Pretix */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">
                Age Distribution
              </CardTitle>
              <CardDescription>
                Current year registration breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || ageData.length === 0 ? (
                <div className="h-[280px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={ageConfig} className="h-[280px] w-full">
                  <BarChart
                    data={ageData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.orange}
                      radius={[4, 4, 0, 0]}
                      label={{
                        position: "top",
                        fill: "rgba(255,255,255,0.9)",
                        fontSize: 12,
                      }}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Gender Distribution — current year from Pretix */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">
                Gender Distribution
              </CardTitle>
              <CardDescription>
                Current year registration breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !hasGenderThisYear ? (
                <div className="h-[280px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer
                  config={genderConfig}
                  className="h-[280px] w-full"
                >
                  <PieChart width={300} height={280}>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={genderThisYearData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      <Cell fill={CHART_COLORS.orange} />
                      <Cell fill={CHART_COLORS.teal} />
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Background Distribution Pie Chart */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">
                Background Distribution
              </CardTitle>
              <CardDescription>
                Participant professional breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[280px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer
                  config={backgroundConfig}
                  className="h-[280px] w-full"
                >
                  <PieChart width={300} height={280}>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={backgroundData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      <Cell fill={CHART_COLORS.orange} />
                      <Cell fill={CHART_COLORS.teal} />
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* (Legacy manual gender card removed — live card below replaces it.) */}

          {/* Top Roles — current year horizontal bar */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">Top Roles</CardTitle>
              <CardDescription>Current year attendee roles</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || positionData.length === 0 ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={positionConfig}>
                  <BarChart
                    data={positionData}
                    layout="vertical"
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                      horizontal={false}
                    />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.orange}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Companies — current year horizontal bar */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">Top Companies</CardTitle>
              <CardDescription>Current year attendee companies</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || companyData.length === 0 ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={companyConfig}>
                  <BarChart
                    data={companyData}
                    layout="vertical"
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                      horizontal={false}
                    />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.orange}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* AWS Experience — distribution by years */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">Participant YoE using AWS</CardTitle>
              <CardDescription>
                Current year attendee distribution
                {awsExperience !== null && (
                  <span className="text-xs ml-1 text-primary">
                    (avg {awsExperience.toFixed(1)} yr)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || awsExperienceData.length === 0 ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={awsExperienceConfig}>
                  <BarChart
                    data={awsExperienceData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill={CHART_COLORS.orange}
                      radius={[4, 4, 0, 0]}
                      label={{
                        position: "top",
                        fill: "rgba(255,255,255,0.9)",
                        fontSize: 12,
                      }}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

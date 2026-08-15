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
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCommunityStatistics } from "@/lib/api";
import type { CommunityStatistics } from "@/lib/types";

interface StatisticsChartsProps {}

// Modern, clean Chart Skeleton component supporting Line, Pie/Donut, Vertical Bar, and Horizontal Bar wireframes
export function ChartSkeleton({
  height = "h-[300px]",
  type = "bar",
}: {
  height?: string;
  type?: "bar" | "line" | "pie" | "horizontal-bar";
}) {
  return (
    <div
      className={`${height} w-full relative flex flex-col justify-between select-none py-1 overflow-hidden animate-pulse`}
    >
      {type === "line" && (
        <div className="w-full h-full flex flex-col justify-between py-2">
          {/* SVG Line Wireframe */}
          <div className="relative flex-1 w-full flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="line-skeleton-gradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    className="text-muted-foreground/15"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    className="text-muted-foreground/0"
                  />
                </linearGradient>
              </defs>

              {/* Cartesian grid wireframe */}
              <line
                x1="0"
                y1="20"
                x2="300"
                y2="20"
                stroke="currentColor"
                className="text-border/40"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="50"
                x2="300"
                y2="50"
                stroke="currentColor"
                className="text-border/40"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="80"
                x2="300"
                y2="80"
                stroke="currentColor"
                className="text-border/40"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Area fill */}
              <path
                d="M 10 75 Q 80 30, 150 50 T 290 20 L 290 95 L 10 95 Z"
                fill="url(#line-skeleton-gradient)"
              />

              {/* Curved line path */}
              <path
                d="M 10 75 Q 80 30, 150 50 T 290 20"
                fill="none"
                stroke="currentColor"
                className="text-muted-foreground/40 stroke-[2.5]"
                strokeLinecap="round"
              />

              {/* Node dots */}
              {[
                { cx: 10, cy: 75 },
                { cx: 80, cy: 37 },
                { cx: 150, cy: 50 },
                { cx: 220, cy: 28 },
                { cx: 290, cy: 20 },
              ].map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.cx}
                  cy={pt.cy}
                  r="3.5"
                  fill="currentColor"
                  className="text-muted-foreground/50"
                />
              ))}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="pt-3 border-t border-border/40 flex justify-between px-2">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
      )}

      {type === "pie" && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6 py-2">
          {/* Clean Donut Ring Geometry */}
          <div className="relative h-36 w-36 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              {/* Background Ring Track */}
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                className="text-muted/40"
              />
              {/* Foreground Segmented Ring */}
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="140 226"
                strokeDashoffset="0"
                className="text-muted-foreground/30"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="50 226"
                strokeDashoffset="-155"
                className="text-muted-foreground/20"
              />
            </svg>
          </div>

          {/* Clean Neutral Legend */}
          <div className="flex items-center justify-center gap-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
        </div>
      )}

      {type === "horizontal-bar" && (
        <div className="w-full h-full flex flex-col justify-center space-y-4 px-2 py-3">
          {[
            { labelW: "w-24", barW: "w-[85%]" },
            { labelW: "w-20", barW: "w-[65%]" },
            { labelW: "w-28", barW: "w-[48%]" },
            { labelW: "w-16", barW: "w-[32%]" },
            { labelW: "w-22", barW: "w-[18%]" },
          ].map((row, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Skeleton className={`h-3 ${row.labelW} shrink-0`} />
              <div className="flex-1 flex items-center gap-2">
                <Skeleton className={`h-4 ${row.barW} rounded-md`} />
                <Skeleton className="h-2.5 w-6 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === "bar" && (
        <div className="w-full h-full flex flex-col justify-between py-2">
          {/* Vertical Bars on Grid */}
          <div className="relative flex-1 w-full flex items-end justify-between gap-3 px-4 pb-2 border-b border-border/40">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-border/20 pointer-events-none" />
            <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-border/20 pointer-events-none" />
            <div className="absolute inset-x-0 top-3/4 border-b border-dashed border-border/20 pointer-events-none" />

            {/* Bars */}
            {[
              "h-[35%]",
              "h-[70%]",
              "h-[45%]",
              "h-[90%]",
              "h-[60%]",
              "h-[80%]",
            ].map((heightClass, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end z-10"
              >
                <Skeleton
                  className={`w-full max-w-[42px] ${heightClass} rounded-t-md`}
                />
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="pt-3 flex justify-between px-4">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
      )}
    </div>
  );
}

// Explicit empty state component when datasets are empty
export function EmptyChartState({ height = "h-[300px]" }: { height?: string }) {
  return (
    <div
      className={`${height} w-full flex items-center justify-center text-muted-foreground text-sm font-medium border border-dashed border-border/50 rounded-lg bg-muted/10`}
    >
      No data yet
    </div>
  );
}

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

// Colors matching the reference design
const CHART_COLORS = {
  orange: "hsl(36 100% 50%)", // AWS Orange
  teal: "hsl(186 100% 42%)", // Professional Teal/Cyan
};

type ChartStatus = "loading" | "ready" | "error";

export function StatisticsCharts({}: StatisticsChartsProps = {}) {
  const [data, setData] = useState<CommunityStatistics | null>(null);
  const [status, setStatus] = useState<ChartStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    fetchCommunityStatistics()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = status === "loading";

  // Datasets
  const participantGrowth = data?.participantNumOfTheYear ?? [];
  const eventPerYear = data?.eventPerYear ?? [];

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
  const hasBackgroundData = backgroundData.some((b) => b.value > 0);

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

  if (status === "error") {
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
                <ChartSkeleton height="h-[300px]" type="line" />
              ) : participantGrowth.length === 0 ? (
                <EmptyChartState height="h-[300px]" />
              ) : (
                <ChartContainer config={participantsConfig}>
                  <LineChart
                    data={participantGrowth}
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
                <ChartSkeleton height="h-[300px]" type="bar" />
              ) : eventPerYear.length === 0 ? (
                <EmptyChartState height="h-[300px]" />
              ) : (
                <ChartContainer config={eventsConfig}>
                  <BarChart
                    data={eventPerYear}
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
              {isLoading ? (
                <ChartSkeleton height="h-[280px]" type="bar" />
              ) : ageData.length === 0 ? (
                <EmptyChartState height="h-[280px]" />
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
              {isLoading ? (
                <ChartSkeleton height="h-[280px]" type="pie" />
              ) : !hasGenderThisYear ? (
                <EmptyChartState height="h-[280px]" />
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
                <ChartSkeleton height="h-[280px]" type="pie" />
              ) : !hasBackgroundData ? (
                <EmptyChartState height="h-[280px]" />
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

          {/* Top Roles — current year horizontal bar */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">Top Roles</CardTitle>
              <CardDescription>Current year attendee roles</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton height="h-[300px]" type="horizontal-bar" />
              ) : positionData.length === 0 ? (
                <EmptyChartState height="h-[300px]" />
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
              {isLoading ? (
                <ChartSkeleton height="h-[300px]" type="horizontal-bar" />
              ) : companyData.length === 0 ? (
                <EmptyChartState height="h-[300px]" />
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
              {isLoading ? (
                <ChartSkeleton height="h-[300px]" />
              ) : awsExperienceData.length === 0 ? (
                <EmptyChartState height="h-[300px]" />
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

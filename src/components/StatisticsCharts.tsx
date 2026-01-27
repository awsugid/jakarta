import React, { useState, useEffect } from "react";
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

interface StatisticsData {
  participantNumOfTheYear: { year: number; total: number }[];
  eventPerYear: { year: number; total: number }[];
  participantGenderDistributionLastYear: { male: number; female: number };
  participantBackgroundDistribution: {
    professional: number;
    student: number;
  };
}

interface StatisticsChartsProps {
  data: StatisticsData;
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

// Colors matching the reference design
const CHART_COLORS = {
  orange: "hsl(36 100% 50%)", // AWS Orange
  teal: "hsl(186 100% 42%)", // Professional Teal/Cyan
};

export function StatisticsCharts({ data }: StatisticsChartsProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Delay chart rendering slightly to improve perceived performance
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Transform gender data for pie chart
  const genderData = [
    { name: "male", value: data.participantGenderDistributionLastYear.male },
    {
      name: "female",
      value: data.participantGenderDistributionLastYear.female,
    },
  ];

  // Transform background data for pie chart
  const backgroundData = [
    {
      name: "professional",
      value: data.participantBackgroundDistribution.professional,
    },
    {
      name: "student",
      value: data.participantBackgroundDistribution.student,
    },
  ];

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
              {!isLoaded ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={participantsConfig}>
                  <LineChart
                    data={data.participantNumOfTheYear}
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
              {!isLoaded ? (
                <div className="h-[300px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer config={eventsConfig}>
                  <BarChart
                    data={data.eventPerYear}
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

          {/* Gender Distribution Pie Chart */}
          <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="text-foreground">
                Gender Distribution
              </CardTitle>
              <CardDescription>Last year participant breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {!isLoaded ? (
                <div className="h-[280px] w-full animate-pulse bg-muted/20 rounded-lg" />
              ) : (
                <ChartContainer
                  config={genderConfig}
                  className="h-[280px] w-full"
                >
                  <PieChart width={300} height={280}>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={genderData}
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
              {!isLoaded ? (
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
        </div>
      </div>
    </section>
  );
}

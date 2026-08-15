import { Users, Presentation, Layers, Heart } from "lucide-react";

export function MetricsBar() {
  const stats = [
    {
      label: "Expected Attendees",
      value: "300+",
      icon: Users,
      color: "text-orange-500",
      glowColor: "from-orange-500/10 to-amber-500/0",
      gradient: "from-orange-400 to-amber-300",
      bgColor: "bg-orange-500/10",
      borderColor: "hover:border-orange-500/30",
    },
    {
      label: "Expert Speakers",
      value: "20+",
      icon: Presentation,
      color: "text-pink-500",
      glowColor: "from-pink-500/10 to-rose-500/0",
      gradient: "from-pink-400 to-rose-300",
      bgColor: "bg-pink-500/10",
      borderColor: "hover:border-pink-500/30",
    },
    {
      label: "Technical Tracks",
      value: "2 Tracks",
      icon: Layers,
      color: "text-purple-500",
      glowColor: "from-purple-500/10 to-indigo-500/0",
      gradient: "from-purple-400 to-indigo-300",
      bgColor: "bg-purple-500/10",
      borderColor: "hover:border-purple-500/30",
    },
    {
      label: "AWS User Group",
      value: "Jakarta",
      icon: Heart,
      color: "text-blue-500",
      glowColor: "from-blue-500/10 to-cyan-500/0",
      gradient: "from-blue-400 to-cyan-300",
      bgColor: "bg-blue-500/10",
      borderColor: "hover:border-blue-500/30",
    },
  ];

  return (
    <section className="relative bg-background border-y border-border py-16 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.01] via-pink-500/[0.01] to-orange-500/[0.01] pointer-events-none" />

      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:bg-card/90 ${stat.borderColor} hover:shadow-xl hover:shadow-black/20 group relative overflow-hidden`}
              >
                {/* Glowing effect inside card on hover */}
                <div className={`absolute -inset-px bg-gradient-to-br ${stat.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                {/* Icon Container */}
                <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} mb-4 relative z-10 transition-transform duration-500 group-hover:scale-110 shadow-inner`}>
                   <Icon className="h-6 w-6" />
                </div>

                {/* Stat Value with Gradient text */}
                <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient} relative z-10 font-mono`}>
                  {stat.value}
                </h3>

                {/* Stat Label */}
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium tracking-wide uppercase relative z-10">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

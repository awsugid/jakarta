import { useState } from "react";
import { Mic, Award, Sparkles, Handshake, Users, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CFPSection() {
  const [isOpen, setIsOpen] = useState(false);

  const perks = [
    {
      title: "Exclusive Speaker Swag",
      description: "Receive unique speaker-only merchandise and custom badges designed to stand out.",
      icon: Award,
    },
    {
      title: "VIP Dinner Access",
      description: "Network with AWS heroes, DevShare leaders, and community organizers at the VIP dinner.",
      icon: Handshake,
    },
    {
      title: "Professional Media Assets",
      description: "Get high-res photos and full video recordings of your presentation published on our channels.",
      icon: Sparkles,
    },
    {
      title: "Community Impact",
      description: "Share your practical insights and help 1,000+ local practitioners grow their cloud careers.",
      icon: Users,
    },
  ];

  const tracks = [
    {
      title: "Generative AI & ML",
      description: "Advanced model execution, vector database applications, and AI agent designs.",
      tags: ["Bedrock", "SageMaker", "RAG", "LLMs", "Agents"],
    },
    {
      title: "Serverless & Modern Ops",
      description: "Event-driven microservices, serverless containers, API gateways, and orchestration.",
      tags: ["Lambda", "Step Functions", "Fargate", "APIs"],
    },
    {
      title: "Platform Eng & DevOps",
      description: "Infrastructure as Code automation, telemetry pipelines, and financial optimization.",
      tags: ["IaC & CDK", "Terraform", "OpenTelemetry", "FinOps"],
    },
    {
      title: "Security & Resiliency",
      description: "Zero-trust network architecture, identity controls, compliance, and disaster recovery.",
      tags: ["IAM", "Zero Trust", "Disaster Recovery", "Compliance"],
    },
  ];

  return (
    <section id="cfp" className="py-24 px-4 bg-background dark:bg-slate-950 relative border-b border-border dark:border-white/5 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute right-0 top-1/4 w-[350px] h-[350px] bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[300px] h-[300px] bg-orange-500/5 dark:bg-orange-950/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container max-w-6xl mx-auto space-y-20">
        
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
            🎤 Call for Speakers
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Share Your Story at <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">CFP 2026</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 mx-auto rounded-full" />
          <p className="text-muted-foreground text-base sm:text-lg font-light leading-relaxed">
            Join the largest community-led developer conference in Indonesia. We welcome technical deep dives, architectural case studies, and hands-on guide proposals from both first-time speakers and seasoned experts.
          </p>
        </div>

        {/* Section 1: Tracks & Topics We Love (Full Width Deck) */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground/80 border-l-2 border-orange-500 pl-3">
              Tracks & Topics We Love
            </h3>
            <div className="h-px bg-border dark:bg-white/10 flex-1 hidden sm:block" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tracks.map((track, idx) => (
              <div 
                key={`track-${idx}`} 
                className="flex flex-col justify-between p-6 rounded-2xl border border-border dark:border-white/5 bg-card/40 dark:bg-white/[0.01] backdrop-blur-sm relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:bg-card/75 dark:hover:bg-white/[0.03] hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5 min-h-[220px]"
              >
                {/* Large Background Track Number */}
                <div className="absolute right-4 top-2 text-6xl font-extrabold font-mono text-orange-500/[0.04] dark:text-orange-500/[0.06] select-none group-hover:text-orange-500/[0.08] transition-colors">
                  {`0${idx + 1}`}
                </div>
                
                {/* Content */}
                <div className="space-y-3 relative z-10">
                  <h4 className="font-semibold text-foreground text-base group-hover:text-orange-400 transition-colors">
                    {track.title}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {track.description}
                  </p>
                </div>
                
                {/* Tags List */}
                <div className="flex flex-wrap gap-1.5 pt-4 relative z-10">
                  {track.tags.map((tag, tagIdx) => (
                    <span 
                      key={tagIdx}
                      className="bg-orange-500/5 text-orange-600 dark:text-orange-400 border border-orange-500/10 text-xs px-2 py-0.5 rounded-md font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Speaker Benefits & Perks (Full Width Deck) */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground/80 border-l-2 border-purple-500 pl-3">
              Speaker Benefits & Perks
            </h3>
            <div className="h-px bg-border dark:bg-white/10 flex-1 hidden sm:block" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map((perk, idx) => {
              const Icon = perk.icon;
              return (
                <div 
                  key={`perk-${idx}`} 
                  className="flex flex-col items-center text-center p-6 rounded-2xl border border-border dark:border-white/5 bg-card/40 dark:bg-white/[0.01] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-card/75 dark:hover:bg-white/[0.03] hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/5 group"
                >
                  <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl h-12 w-12 flex items-center justify-center mb-4 transition-colors group-hover:bg-purple-500/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground text-base group-hover:text-purple-400 transition-colors">
                      {perk.title}
                    </h4>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      {perk.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full-width CFP Action Banner */}
        <div className="p-8 sm:p-10 rounded-3xl border border-purple-500/20 dark:border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] via-card/50 to-orange-500/[0.02] dark:from-purple-500/[0.03] dark:via-slate-900/40 dark:to-orange-500/[0.01] backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[64px]" />
          
          <div className="space-y-4 text-center lg:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CFP Open & Accepting Submissions
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                📅 Submission Deadline
              </p>
              <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
                August 31, 2026 <span className="text-base font-normal text-muted-foreground">at 23:59 WIB</span>
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Sessions can be submitted for <strong>30 or 45-minute</strong> time slots (inclusive of Q&A). Review the rules below and redirect to Sessionize to submit your proposal.
            </p>
          </div>
          
          <div className="w-full lg:w-auto shrink-0 relative z-10">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:min-w-[240px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-6 rounded-xl active:scale-95 transition-all text-base justify-center shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30">
                  <Mic className="mr-2 h-5 w-5" /> Submit Your Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-background dark:bg-slate-900 border-border dark:border-white/10 text-foreground dark:text-white">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
                    <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" /> CFP Submission Guidelines
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm">
                    Please read the speaker rules and checklist before redirecting to Sessionize to submit your proposal.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4 text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-2.5">
                    <li>Sessions are 30 or 45 minutes long, including Q&A.</li>
                    <li>Content must be highly technical or customer-focused (no marketing pitches).</li>
                    <li>Speakers must be present physically at the venue in Tangerang.</li>
                    <li>You may submit up to 3 different proposals.</li>
                  </ul>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border dark:border-white/10">
                  <Button variant="outline" className="flex-1 border-border dark:border-white/10 text-foreground dark:text-white hover:bg-muted" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" 
                    onClick={() => {
                      window.open("https://sessionize.com/aws-community-day-indonesia-2026", "_blank");
                      setIsOpen(false);
                    }}
                  >
                    Continue to Sessionize <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      </div>
    </section>
  );
}

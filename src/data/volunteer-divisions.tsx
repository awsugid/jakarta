import React from "react";
import {
  CalendarCheck,
  Monitor,
  Package,
  Palette,
  Camera,
  Calendar,
  Megaphone,
  Share2,
  UserCheck,
  HandCoins,
  Mic,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface DivisionItem {
  icon: LucideIcon;
  name: string;
  roles: string[];
  description: React.ReactNode;
  skills: string[];
}

export const divisions: DivisionItem[] = [
  {
    icon: CalendarCheck,
    name: "Registration",
    roles: ["Registration Desk", "Swag Distribution"],
    description:
      "Ensures the on-site re-registration process runs smoothly on event day. After registration is complete, helps prepare and distribute swag kits to all attendees.",
    skills: ["Organization", "Attention to Detail", "Communication"],
  },
  {
    icon: Monitor,
    name: "FOH (Front of House)",
    roles: ["Multimedia Operator", "Slide Controller"],
    description:
      "Responsible for managing all multimedia aspects during the event, including presentation systems, live streaming, and broadcasting tools (e.g., OBS), ensuring smooth and uninterrupted execution.",
    skills: ["Technical Aptitude", "Problem Solving", "Timing"],
  },
  {
    icon: Package,
    name: "Logistics",
    roles: ["Catering Coordinator", "Merch Manager", "Supplies Handler"],
    description:
      "Manages all event logistics including meals and refreshments, merchandise inventory, stationery supplies, and waste management to keep the venue organized.",
    skills: ["Resource Management", "Planning", "Coordination"],
  },
  {
    icon: Palette,
    name: "Design",
    roles: ["Figma Designer", "Visual Creative"],
    description:
      "Collaborates and designs visual assets using Figma, creating materials that represent the AWS UG Jakarta brand across all event touchpoints and promotional channels.",
    skills: ["Figma", "Brand Identity", "Creativity"],
  },
  {
    icon: Camera,
    name: "Documentation",
    roles: ["Photographer", "Videographer"],
    description:
      "Responsible for capturing key moments throughout the entire event series, preserving memories and creating visual content for the community.",
    skills: ["Photography", "Video Editing", "Storytelling"],
  },
  {
    icon: Calendar,
    name: "Event",
    roles: ["Event Coordinator", "Rundown Manager"],
    description:
      "Responsible for the overall event concept and ensuring the rundown runs exactly as planned, from opening to closing ceremonies.",
    skills: ["Event Planning", "Project Management", "Leadership"],
  },
  {
    icon: Megaphone,
    name: "Runner",
    roles: ["Audience Mic Runner", "Speaker Support"],
    description:
      "Ensures attendees can ask questions properly using the microphone. Also responsible for making sure speakers receive their mic and any other equipment they need on stage.",
    skills: ["Agility", "Awareness", "Communication"],
  },
  {
    icon: Share2,
    name: "Social Media",
    roles: ["Social Media Manager", "Content Poster"],
    description:
      "Responsible for live-posting event updates and highlights to AWS UG Jakarta's social media channels, keeping the online community engaged in real time.",
    skills: ["Social Media Marketing", "Copywriting", "Content Creation"],
  },
  {
    icon: UserCheck,
    name: "Liaison Officer",
    roles: ["Speaker Liaison", "Guest Coordinator"],
    description:
      "Supports speakers before, during, and after the event — handling their needs, coordinating schedules, and ensuring a smooth experience for all guest presenters.",
    skills: ["Relationship Building", "Professionalism", "Time Management"],
  },
  {
    icon: HandCoins,
    name: "Sponsorship",
    roles: ["Sponsor Outreach", "Partnership Coordinator"],
    description:
      "Identifies and builds relationships with potential sponsors and partners to secure funding, resources, and in-kind support for AWS UG Jakarta events.",
    skills: ["Negotiation", "Networking", "Persuasion"],
  },
  {
    icon: Mic,
    name: "Moderator / MC",
    roles: ["Event Host", "Ice Breaker"],
    description:
      "Guides the event from start to finish, keeping the energy high and the atmosphere exciting. Also creates and hosts interactive games for ice breaking sessions.",
    skills: ["Public Speaking", "Crowd Engagement", "Improvisation"],
  },
  {
    icon: Globe,
    name: "Website",
    roles: ["Web Developer", "Content Manager"],
    description: (
      <>
        Builds and maintains the AWS UG Jakarta website, ensuring it stays up to
        date with event information, speaker profiles, and community resources.
        Check out the repository at{" "}
        <a
          href="https://github.com/awsugid/jakarta"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          github.com/awsugid/jakarta
        </a>
        .
      </>
    ),
    skills: ["Web Development", "SEO", "UI/UX"],
  },
];

export const nameToSlug: Record<string, string> = {
  Registration: "registration",
  "FOH (Front of House)": "foh",
  Logistics: "logistics",
  Design: "design",
  Documentation: "documentation",
  Event: "event",
  Runner: "runner",
  "Social Media": "social-media",
  "Liaison Officer": "liaison-officer",
  Sponsorship: "sponsorship",
  "Moderator / MC": "moderator-mc",
  Website: "website",
};

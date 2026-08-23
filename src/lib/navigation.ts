export interface NavItem {
  name: string;
  href: string;
  iconName: "Home" | "Sparkles" | "Calendar" | "BookOpen" | "HandHeart" | "Mic" | "Handshake";
}

export const navItems: NavItem[] = [
  { name: "Home", href: "/", iconName: "Home" },
  { name: "ComDay", href: "/comday", iconName: "Sparkles" },
  { name: "Events", href: "/events", iconName: "Calendar" },
  { name: "Blog", href: "/blog", iconName: "BookOpen" },
  { name: "Volunteer", href: "/volunteer", iconName: "HandHeart" },
  { name: "Speakers", href: "/speakers", iconName: "Mic" },
  { name: "Sponsors", href: "/sponsor", iconName: "Handshake" },
];

import React from "react";
import { EventFAQ, type FAQItem } from "@/components/EventFAQ";
import { volunteerFaqs } from "@/data/faqs";

export type { FAQItem };

export interface VolunteerFAQProps {
  className?: string;
}

export function VolunteerFAQ({ className }: VolunteerFAQProps) {
  return <EventFAQ faqs={volunteerFaqs} className={className} />;
}

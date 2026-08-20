import React from "react";
import { EventFAQ, type FAQItem } from "@/components/EventFAQ";
import { speakerFaqs } from "@/data/faqs";

export type { FAQItem };

export interface SpeakerFAQProps {
  className?: string;
}

export function SpeakerFAQ({ className }: SpeakerFAQProps) {
  return <EventFAQ faqs={speakerFaqs} className={className} />;
}

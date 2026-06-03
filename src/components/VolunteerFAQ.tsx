import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FAQItem {
  question: string;
  answer: string;
}

const volunteerFaqs: FAQItem[] = [
  {
    question: "Do I need technical skills to volunteer?",
    answer:
      "Not necessarily! While some divisions like Tech Support require technical knowledge, we have many roles in Marketing, Community Management, Operations, and more that don't require coding skills.",
  },
  {
    question: "Can I volunteer for multiple divisions?",
    answer:
      "Yes! You can indicate interest in multiple divisions. We'll match you with opportunities based on your skills and event needs.",
  },
  {
    question: "Will I receive training?",
    answer:
      "Absolutely. Each division provides onboarding materials and mentorship from experienced volunteers. We want you to succeed!",
  },
  {
    question: "Can I volunteer remotely?",
    answer:
      "Some roles like Content Creation, Social Media, and Design can be done remotely. However, roles like Registration, Logistics, and Photography require on-site presence.",
  },
  {
    question: "Is this a paid position?",
    answer:
      "Volunteer roles are unpaid, but you'll gain valuable experience, networking opportunities, and recognition within the AWS community. Plus, event meals and swag are included!",
  },
];

export interface VolunteerFAQProps {
  className?: string;
}

export function VolunteerFAQ({ className }: VolunteerFAQProps) {
  return (
    <div className={className}>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {volunteerFaqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border-border/50"
          >
            <AccordionTrigger className="text-left text-lg font-bold text-foreground hover:no-underline hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-lg leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
              <div
                className="pb-4 pt-0"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

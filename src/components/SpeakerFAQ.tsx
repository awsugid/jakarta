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

const speakerFaqs: FAQItem[] = [
  // {
  //   question: "What talk formats do you accept?",
  //   answer:
  //     "We welcome various formats including:<br/><br/>" +
  //     "<strong>Lightning Talks (5-10 minutes):</strong> Quick insights, tips, or announcements<br/>" +
  //     "<strong>Short Sessions (20-30 minutes):</strong> Focused technical demos or case studies<br/>" +
  //     "<strong>Full Sessions (45-60 minutes):</strong> In-depth technical deep dives<br/>" +
  //     "<strong>Workshops (90-120 minutes):</strong> Hands-on learning experiences",
  // },
  {
    question: "Do I need to be an AWS expert?",
    answer:
      "No! We welcome speakers at all levels. Whether you're sharing your first AWS project or your cloud architecture at scale, your unique perspective adds value to our community.",
  },
  {
    question: "Will you help me prepare?",
    answer:
      "Absolutely! Our community leaders offer:<br/><br/>" +
      "• Feedback on your abstract and slides<br/>" +
      "• Practice sessions before the event<br/>" +
      "• Technical review and suggestions<br/>" +
      "• Speaker coaching for first-timers",
  },
  {
    question: "What about travel and accommodation?",
    answer:
      "For local Jakarta events, we don't typically cover travel. For Community Day or special events, we may offer speaker benefits—we'll discuss this when confirming your session.",
  },
  {
    question: "What if I need to cancel?",
    answer:
      "Life happens! Please notify us as early as possible (ideally 2+ weeks before) so we can adjust the schedule or find a replacement.",
  },
  {
    question: "Can I reuse content from other conferences?",
    answer:
      "Yes, as long as you have the rights to present it. We appreciate if you tailor examples to be relevant to the Jakarta/Indonesian context when possible.",
  },
  // {
  //   question: "How far in advance should I apply?",
  //   answer:
  //     "We review proposals on a rolling basis. Applying 4-6 weeks before an event gives us the best chance to schedule you, but we sometimes accommodate last-minute submissions.",
  // },
];

export interface SpeakerFAQProps {
  className?: string;
}

export function SpeakerFAQ({ className }: SpeakerFAQProps) {
  return (
    <div className={className}>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {speakerFaqs.map((faq, index) => (
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

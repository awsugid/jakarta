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

const defaultFaqs: FAQItem[] = [
  {
    question: "Is this event free?",
    answer:
      "Yes! This event is <strong>completely free to attend</strong>. We require a small commitment fee to reserve your spot, which is <strong>fully refundable</strong> when you attend and stay until the end of the event.",
  },
  {
    question: "What is the Commitment Fee?",
    answer:
      "The commitment fee is a <strong>refundable deposit</strong> to reserve your spot. If you <strong>attend the full event, you receive a 100% refund</strong>. This ensures we have accurate attendance numbers for planning.",
  },
  {
    question: "How do I cancel my registration?",
    answer:
      "You can cancel your registration <strong>up to 7 days before the event</strong> by clicking the &ldquo;Cancel&rdquo; button in your confirmation email. Your <strong>commitment fee will be refunded</strong>.",
  },
  {
    question: "What's the refund policy?",
    answer:
      "Your commitment fee is <strong>refunded only if you attend and stay until the end</strong> of the event. <strong>Cancellations 7+ days before the event are also refunded</strong>. If you miss the event or leave early, the fee is not refunded.",
  },
  {
    question: "Can I transfer my registration to someone else?",
    answer:
      "No, registrations are personal and cannot be transferred to another person.",
  },
];

export interface EventFAQProps {
  extraFaqs?: FAQItem[];
  faqs?: FAQItem[];
  className?: string;
}

export function EventFAQ({ extraFaqs, faqs, className }: EventFAQProps) {
  const items: FAQItem[] = faqs ?? [...defaultFaqs, ...(extraFaqs ?? [])];

  return (
    <div className={className}>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {items.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border-border/50"
          >
            <AccordionTrigger className="text-left text-lg font-bold text-foreground hover:no-underline hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-lg leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
              <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

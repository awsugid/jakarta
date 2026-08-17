import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { defaultFaqs, type FAQItem } from "@/data/faqs";

export type { FAQItem };

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

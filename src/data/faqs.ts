export interface FAQItem {
  question: string;
  answer: string;
}

export const defaultFaqs: FAQItem[] = [
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

export const speakerFaqs: FAQItem[] = [
  {
    question: "When will I be called to speak, and is this application for a specific event?",
    answer:
      "As long as your data is submitted, if there is a great match and we need a speaker, we will call you—no matter what event that is.",
  },
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
];

export const volunteerFaqs: FAQItem[] = [
  {
    question: "When will I be called to volunteer, and is this application for a specific event?",
    answer:
      "As long as your data is submitted, if there is a great match and we need a volunteer, we will call you—no matter what event that is.",
  },
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

export const comday26Faqs: FAQItem[] = [
  {
    question: "What is AWS Community Day Jakarta?",
    answer:
      "AWS Community Day is a peer-to-peer developer conference organized by the community for the community. The event features technical talks, workshops, and networking opportunities centered around Amazon Web Services technologies.",
  },
  {
    question: "Where is the event located and how do I get there?",
    answer:
      "The event will take place physically at the <strong>Auditorium Binus @Anggrek</strong>, Jakarta Barat, Indonesia. You can easily access the location via public transit or private vehicles. Click the map location in the Hero section for Google Maps directions.",
  },
  {
    question: "Is there a commitment fee, and is it refundable?",
    answer:
      "Yes, to prevent no-shows and make seats available to genuine learners, we require a small ticket fee. General admission tickets are <strong>fully refundable</strong> if you check in at the registration desk on the day of the event.",
  },
  {
    question: "How can I submit my session proposal?",
    answer:
      "You can submit your proposal directly through our CFP section. Click on 'Submit Your Proposal' which will guide you to our Sessionize page where you can fill in your title, abstract, and speaker details.",
  },
  {
    question: "How can my company sponsor the event?",
    answer:
      "You can explore our sponsorship packages, calculate custom budgets with our interactive tool, and download the official prospectus on our <a href='/sponsors' class='text-orange-400 underline underline-offset-4 hover:text-orange-300'>Sponsors page</a>.",
  },
];

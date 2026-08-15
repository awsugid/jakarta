export const SESSIONIZE_CONFIG = {
  CFP_URL: "https://sessionize.com/AWSComDayJakarta26/",
  status: "open" as const,
  statusLabel: "CFP Open & Accepting Submissions",
  venue: "BINUS Anggrek, Jakarta Barat",
  dates: {
    opens: "2026-05-01",
    deadline: "2026-09-17",
    deadlineDisplay: "September 17, 2026",
    deadlineTimeDisplay: "23:59 WIB",
    eventDate: "2026-10-31",
    eventDateDisplay: "October 31, 2026",
  },
  tracks: [
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
  ],
  guidelines: [
    "Sessions are 30 or 45 minutes long, including Q&A.",
    "Content must be highly technical or customer-focused (no marketing pitches).",
    "Speakers must be present physically at the venue in BINUS Anggrek, Jakarta Barat.",
    "You may submit up to 3 different proposals.",
  ],
} as const;

export type SessionizeConfig = typeof SESSIONIZE_CONFIG;

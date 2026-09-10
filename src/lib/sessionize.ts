export const SESSIONIZE_CONFIG = {
  CFP_URL: "https://sessionize.com/AWSComDayJakarta26/",
  status: "open" as const,
  statusLabel: "CFP Open & Accepting Submissions",
  venue: "BINUS Anggrek, Jakarta Barat",
  dates: {
    opens: "2026-05-01",
    deadline: "2026-09-25",
    deadlineDisplay: "September 25, 2026",
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
    "Deep technical insights or real-world use cases (no marketing or sales pitches).",
    "30 or 45 minutes per session, including live Q&A.",
    "In-person presentation required at BINUS Anggrek, Jakarta Barat.",
    "Maximum 1 proposal per speaker (submit your strongest topic).",
  ],
} as const;

export type SessionizeConfig = typeof SESSIONIZE_CONFIG;

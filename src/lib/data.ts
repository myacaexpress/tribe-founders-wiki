export interface RadarItem {
  id: string;
  title: string;
  level: "red" | "amber" | "sage";
  daysUntil?: number;
  description?: string;
}

export interface GroupTableItem {
  id: string;
  title: string;
  status: "raised" | "discussed" | "decided" | "executing" | "complete";
  owner?: string;
  raised?: string;
  decided?: string;
}

export interface LaneItem {
  id: string;
  title: string;
  status: "active" | "exploring" | "complete";
  zone: "active" | "exploring";
  description?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  founder?: "shawn" | "mark" | "michael";
}

export interface ToolItem {
  id: string;
  name: string;
  url: string;
  icon: string;
}

// Radar items
export const radarItems: RadarItem[] = [
  {
    id: "florida-license",
    title: "Florida insurance license",
    level: "red",
    daysUntil: 12,
    description: "Exam scheduled for April 22",
  },
  {
    id: "carrier-contract",
    title: "Humana contract negotiation",
    level: "red",
    daysUntil: 5,
    description: "Final terms due to underwriting",
  },
  {
    id: "entity-filing",
    title: "LLC formation documents",
    level: "amber",
    daysUntil: 18,
    description: "Secretary of State filing pending",
  },
  {
    id: "tax-id",
    title: "Apply for EIN",
    level: "amber",
    daysUntil: 3,
    description: "IRS application",
  },
  {
    id: "product-setup",
    title: "Product training materials",
    level: "sage",
    daysUntil: 45,
    description: "For agent onboarding",
  },
];

// Group Table decisions
export const groupTableItems: GroupTableItem[] = [
  {
    id: "pod-launch-date",
    title: "Confirm Pod 1 launch date (June 15?)",
    status: "discussed",
    owner: "Mark",
    raised: "April 2",
  },
  {
    id: "pricing-strategy",
    title: "Set agent compensation model",
    status: "raised",
    owner: "Michael",
    raised: "April 8",
  },
  {
    id: "tech-stack",
    title: "Approve CRM selection (Salesforce or HubSpot?)",
    status: "raised",
    owner: "Shawn",
    raised: "April 9",
  },
  {
    id: "office-location",
    title: "Lease office space in Tampa/St. Pete",
    status: "executing",
    owner: "Mark",
    raised: "March 25",
    decided: "April 1",
  },
];

// Founder lanes
export const laneSheesh: LaneItem[] = [
  {
    id: "shawn-tech-setup",
    title: "CRM + Integration Stack",
    status: "active",
    zone: "active",
    description: "Evaluating Salesforce, HubSpot, and custom solutions",
  },
  {
    id: "shawn-security",
    title: "HIPAA Compliance Framework",
    status: "active",
    zone: "active",
    description: "Audit, encryption, and BAAs",
  },
];

export const laneItems: Record<string, LaneItem[]> = {
  shawn: [
    {
      id: "shawn-tech-setup",
      title: "CRM + Integration Stack",
      status: "active",
      zone: "active",
      description: "Evaluating Salesforce, HubSpot, and custom solutions",
    },
    {
      id: "shawn-security",
      title: "HIPAA Compliance Framework",
      status: "active",
      zone: "active",
      description: "Audit, encryption, and BAAs",
    },
  ],
  mark: [
    {
      id: "mark-onboarding",
      title: "Agent Onboarding Process",
      status: "active",
      zone: "active",
      description: "Licensing, training, and support workflows",
    },
    {
      id: "mark-operations",
      title: "Operations Manual",
      status: "active",
      zone: "active",
      description: "Procedures for renewals and claims",
    },
  ],
  michael: [
    {
      id: "michael-financials",
      title: "Financial Model & Projections",
      status: "active",
      zone: "active",
      description: "5-year forecast and break-even analysis",
    },
    {
      id: "michael-training",
      title: "Training Curriculum",
      status: "exploring",
      zone: "exploring",
      description: "Medicare fundamentals and product deep-dives",
    },
  ],
};

// Task items
export const taskItems: TaskItem[] = [
  {
    id: "task-1",
    title: "Review carrier applications",
    done: false,
    founder: "mark",
  },
  {
    id: "task-2",
    title: "Finalize LLC operating agreement",
    done: false,
    founder: "michael",
  },
  {
    id: "task-3",
    title: "Setup Google Workspace domain",
    done: true,
    founder: "shawn",
  },
  {
    id: "task-4",
    title: "Schedule pod launch call",
    done: true,
    founder: "mark",
  },
  {
    id: "task-5",
    title: "Draft agent compensation structure",
    done: false,
    founder: "michael",
  },
];

// Tools
export const toolItems: ToolItem[] = [
  {
    id: "tool-gmail",
    name: "Gmail",
    url: "https://mail.google.com",
    icon: "📧",
  },
  {
    id: "tool-calendar",
    name: "Calendar",
    url: "https://calendar.google.com",
    icon: "📅",
  },
  {
    id: "tool-meet",
    name: "Meet",
    url: "https://meet.google.com",
    icon: "📹",
  },
  {
    id: "tool-drive",
    name: "Drive",
    url: "https://drive.google.com",
    icon: "📁",
  },
  {
    id: "tool-docs",
    name: "Docs",
    url: "https://docs.google.com",
    icon: "📄",
  },
  {
    id: "tool-sheets",
    name: "Sheets",
    url: "https://sheets.google.com",
    icon: "📊",
  },
];

// State of business sentence (hardcoded for Phase 1)
export const businessStateSentence =
  "Three founders, zero external funding, building a Florida Medicare agency. Pod 1 launch in June 2026.";

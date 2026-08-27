export type Decision = "SEND_MESSAGE" | "WAIT" | "ESCALATE" | "REQUEST_HUMAN";

export interface EngagementContext {
  customerResponded: boolean;
  salespersonContacted: boolean;
  hasAppointment: boolean;
  activelyEngaged: boolean;
  pendingDeal: boolean;
  safeToContact: boolean;
  asksAboutRestrictedTopic: boolean;
}

export interface Recommendation {
  decision: Decision;
  reason: string;
  confidence: number;
}

export function recommendNextAction(context: EngagementContext): Recommendation {
  if (!context.safeToContact) return { decision: "WAIT", reason: "Customer is not eligible for outbound contact.", confidence: 1 };
  if (context.asksAboutRestrictedTopic) return { decision: "REQUEST_HUMAN", reason: "Pricing, financing, or policy approval is required.", confidence: 0.99 };
  if (context.pendingDeal) return { decision: "ESCALATE", reason: "An active deal requires manager ownership.", confidence: 0.96 };
  if (context.hasAppointment) return { decision: "SEND_MESSAGE", reason: "Confirm the scheduled appointment while intent is high.", confidence: 0.92 };
  if (context.salespersonContacted && !context.customerResponded) return { decision: "WAIT", reason: "Avoid overlapping the salesperson's recent outreach.", confidence: 0.9 };
  if (context.activelyEngaged || context.customerResponded) return { decision: "SEND_MESSAGE", reason: "Continue the active customer conversation.", confidence: 0.87 };
  return { decision: "ESCALATE", reason: "Insufficient context for safe automated outreach.", confidence: 0.74 };
}

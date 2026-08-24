export type Channel = "SMS" | "EMAIL" | "CALL" | "CRM";
export type EventKind = "LEAD_CREATED" | "AI_TEXT_SENT" | "CUSTOMER_REPLIED" | "CALL_COMPLETED" | "APPOINTMENT_CREATED" | "HUMAN_HANDOFF" | "CUSTOMER_VIEWED" | "NOTE_ADDED";

export interface MessageRecommendation {
  title: string;
  reason: string;
  confidence: number;
  channel: Extract<Channel, "SMS" | "EMAIL">;
  body: string;
}

export interface CustomerEvent {
  id: string;
  type: EventKind;
  title: string;
  detail: string;
  channel: Channel;
  timestamp: string;
}

export interface Customer {
  id: string;
  initials: string;
  name: string;
  vehicle: string;
  source: string;
  intent: number;
  status: string;
  reason: string;
  action: string;
  phone?: string;
  email?: string;
  vinSolutionsUrl?: string;
  recommendation?: MessageRecommendation;
  events: CustomerEvent[];
}

export interface DashboardStat {
  label: string;
  value: string;
  delta: string;
  caption: string;
}

export interface RuntimeStatus {
  dataMode: "demo" | "database";
  state: "ready" | "demo" | "unavailable";
  label: string;
  detail: string;
  lastEventAt: string | null;
  pendingActions: number;
}

export interface DashboardSnapshot {
  customers: Customer[];
  stats: DashboardStat[];
  runtime: RuntimeStatus;
}

export interface QueuedMessage {
  actionId: string;
  mode: "demo" | "database";
  status: "DEMO_ONLY" | "APPROVED" | "ALREADY_SENT" | "PROCESSING" | "FAILED" | "CANCELLED";
  duplicate: boolean;
}

export interface ApprovedAction {
  actionId: string;
  customerId: string;
  channel: Extract<Channel, "SMS" | "EMAIL">;
  body: string;
  approvedBy: string;
  createdAt: string;
  status: "APPROVED";
}

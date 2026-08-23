export type Channel = "SMS" | "EMAIL" | "CALL" | "CRM";
export type EventKind = "LEAD_CREATED" | "AI_TEXT_SENT" | "CUSTOMER_REPLIED" | "CALL_COMPLETED" | "APPOINTMENT_CREATED" | "HUMAN_HANDOFF";

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
  phone: string;
  email: string;
  events: CustomerEvent[];
}

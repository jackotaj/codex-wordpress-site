import type { Channel, CustomerEvent } from "@/lib/types";

export interface CRMCustomer {
  externalId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface OutboundMessage {
  customerId: string;
  channel: Extract<Channel, "SMS" | "EMAIL">;
  body: string;
  approvedBy: string;
}

export interface CRMConnector {
  getCustomer(externalId: string): Promise<CRMCustomer | null>;
  getCustomerHistory(externalId: string): Promise<CustomerEvent[]>;
  sendSMS(message: OutboundMessage): Promise<{ externalMessageId: string }>;
  sendEmail(message: OutboundMessage): Promise<{ externalMessageId: string }>;
  getActivities(since: Date): Promise<CustomerEvent[]>;
  createNote(customerId: string, note: string): Promise<{ externalNoteId: string }>;
}

export type ConnectorEventEnvelope = {
  eventId: string;
  occurredAt: string;
  source: "VINSOLUTIONS_BROWSER" | "VINSOLUTIONS_API" | "GOTO_CONNECT";
  customer: CRMCustomer;
  event: Omit<CustomerEvent, "id">;
};

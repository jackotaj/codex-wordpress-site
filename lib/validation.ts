import { z } from "zod";

const channelSchema = z.enum(["SMS", "EMAIL", "CALL", "CRM"]);
const eventKindSchema = z.enum([
  "LEAD_CREATED",
  "AI_TEXT_SENT",
  "CUSTOMER_REPLIED",
  "CALL_COMPLETED",
  "APPOINTMENT_CREATED",
  "HUMAN_HANDOFF",
  "CUSTOMER_VIEWED",
  "NOTE_ADDED",
]);

const recommendationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(1).max(600),
  confidence: z.number().min(0).max(1),
  channel: z.enum(["SMS", "EMAIL"]),
  body: z.string().trim().min(1).max(4000),
}).strict();

export const connectorEventEnvelopeSchema = z.object({
  eventId: z.string().trim().min(1).max(240),
  occurredAt: z.string().datetime({ offset: true }),
  source: z.enum(["VINSOLUTIONS_BROWSER", "VINSOLUTIONS_API", "GOTO_CONNECT"]),
  customer: z.object({
    externalId: z.string().trim().min(1).max(240),
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(320).optional(),
  }).strict(),
  dashboard: z.object({
    vehicle: z.string().trim().max(240).optional(),
    leadSource: z.string().trim().max(160).optional(),
    status: z.string().trim().max(120).optional(),
    intent: z.number().int().min(0).max(100).optional(),
    vinSolutionsUrl: z.string().url().max(2000).optional(),
    nextBestAction: z.string().trim().max(240).optional(),
    reason: z.string().trim().max(600).optional(),
    recommendation: recommendationSchema.optional(),
  }).strict().optional(),
  event: z.object({
    type: eventKindSchema,
    title: z.string().trim().min(1).max(240),
    detail: z.string().trim().max(4000),
    channel: channelSchema,
    timestamp: z.string().datetime({ offset: true }),
  }).strict(),
}).strict();

export const engagementContextSchema = z.object({
  customerResponded: z.boolean(),
  salespersonContacted: z.boolean(),
  hasAppointment: z.boolean(),
  activelyEngaged: z.boolean(),
  pendingDeal: z.boolean(),
  safeToContact: z.boolean(),
  asksAboutRestrictedTopic: z.boolean(),
}).strict();

export const approvedMessageSchema = z.object({
  customerId: z.string().trim().min(1).max(240),
  channel: z.enum(["SMS", "EMAIL"]),
  body: z.string().trim().min(1).max(4000),
  approvedBy: z.string().trim().min(1).max(160),
}).strict();

export type ConnectorEventInput = z.infer<typeof connectorEventEnvelopeSchema>;
export type ApprovedMessageInput = z.infer<typeof approvedMessageSchema>;

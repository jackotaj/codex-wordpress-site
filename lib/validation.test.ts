import { describe, expect, it } from "vitest";

import { approvedMessageSchema, connectorEventEnvelopeSchema, engagementContextSchema } from "./validation";

describe("runtime validation", () => {
  it("rejects an incomplete connector envelope", () => {
    expect(connectorEventEnvelopeSchema.safeParse({ eventId: "event-1" }).success).toBe(false);
  });

  it("rejects a recommendation context with missing booleans", () => {
    expect(engagementContextSchema.safeParse({ safeToContact: true }).success).toBe(false);
  });

  it("rejects an empty approved message", () => {
    expect(approvedMessageSchema.safeParse({ customerId: "vs-1", channel: "SMS", body: "", approvedBy: "Todd" }).success).toBe(false);
  });
});

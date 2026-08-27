import { describe, expect, it } from "vitest";

import { recommendNextAction, type EngagementContext } from "./decision-engine";

const base: EngagementContext = {
  customerResponded: false,
  salespersonContacted: false,
  hasAppointment: false,
  activelyEngaged: false,
  pendingDeal: false,
  safeToContact: true,
  asksAboutRestrictedTopic: false,
};

describe("recommendNextAction", () => {
  it("blocks outbound contact when the customer is not eligible", () => {
    expect(recommendNextAction({ ...base, safeToContact: false }).decision).toBe("WAIT");
  });

  it("requires a human for restricted pricing or financing topics", () => {
    expect(recommendNextAction({ ...base, asksAboutRestrictedTopic: true }).decision).toBe("REQUEST_HUMAN");
  });

  it("escalates active deals to a manager", () => {
    expect(recommendNextAction({ ...base, pendingDeal: true }).decision).toBe("ESCALATE");
  });

  it("recommends an appointment confirmation", () => {
    expect(recommendNextAction({ ...base, hasAppointment: true }).decision).toBe("SEND_MESSAGE");
  });

  it("suppresses overlapping outreach after salesperson contact", () => {
    expect(recommendNextAction({ ...base, salespersonContacted: true }).decision).toBe("WAIT");
  });
});

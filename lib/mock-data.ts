import type { Customer } from "./types";

export const customers: Customer[] = [
  {
    id: "vs-10482", initials: "JS", name: "John Smith", vehicle: "2026 Palisade Calligraphy", source: "Hyundai.com", intent: 92, status: "Hot lead", reason: "Asked about monthly payment", action: "Confirm Saturday appointment", phone: "(703) 555-0182", email: "john.smith@example.com",
    recommendation: { title: "Confirm the appointment", reason: "John is highly engaged and has agreed to Saturday at 1 PM. Send a quick confirmation while intent is high.", confidence: 0.92, channel: "SMS", body: "Perfect, John — I have you down for Saturday at 1 PM to drive the Palisade Calligraphy. I’ll make sure it’s ready for you. — Sarah, Todd’s assistant" },
    events: [
      { id: "e1", type: "APPOINTMENT_CREATED", title: "Appointment scheduled", detail: "Saturday, August 29 at 1:00 PM · Palisade test drive", channel: "CRM", timestamp: "2026-08-23T13:15:00.000Z" },
      { id: "e2", type: "CUSTOMER_REPLIED", title: "John replied", detail: "Saturday at 1 works. Can I test drive the Calligraphy?", channel: "SMS", timestamp: "2026-08-23T13:11:00.000Z" },
      { id: "e3", type: "AI_TEXT_SENT", title: "Sarah sent a text", detail: "Absolutely. Would Saturday morning or afternoon work better for a quick test drive?", channel: "SMS", timestamp: "2026-08-23T13:08:00.000Z" },
      { id: "e4", type: "CUSTOMER_REPLIED", title: "John replied", detail: "Still interested in the Palisade. What would payments look like?", channel: "SMS", timestamp: "2026-08-23T13:07:00.000Z" },
      { id: "e5", type: "LEAD_CREATED", title: "New internet lead received", detail: "2026 Hyundai Palisade Calligraphy · Hyundai.com", channel: "CRM", timestamp: "2026-08-23T13:02:00.000Z" }
    ]
  },
  { id: "vs-10478", initials: "MR", name: "Maya Rodriguez", vehicle: "2025 Tucson Limited", source: "AutoTrader", intent: 84, status: "Re-engaged", reason: "Replied after 12 days inactive", action: "Review trade-in request", phone: "(571) 555-0129", email: "maya.r@example.com", events: [] },
  { id: "vs-10451", initials: "DB", name: "David Brooks", vehicle: "2026 Santa Fe SEL", source: "Dealer website", intent: 76, status: "Needs follow-up", reason: "Viewed vehicle 3 times", action: "Send availability update", phone: "(540) 555-0144", email: "david.b@example.com", events: [] },
  { id: "vs-10439", initials: "AK", name: "Aisha Khan", vehicle: "2025 IONIQ 5", source: "Cars.com", intent: 68, status: "Awaiting reply", reason: "Asked about EV charging", action: "Wait until 2:30 PM", phone: "(703) 555-0171", email: "aisha.k@example.com", events: [] }
];

export const stats = [
  { label: "Leads worked", value: "47", delta: "+18%", caption: "vs. 30-day average" },
  { label: "Conversations", value: "23", delta: "49%", caption: "engagement rate" },
  { label: "Appointments", value: "8", delta: "+3", caption: "created today" },
  { label: "Human handoffs", value: "4", delta: "12 min", caption: "average response" }
];

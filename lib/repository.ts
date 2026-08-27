import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { customers as demoCustomers, stats as demoStats } from "./mock-data";
import { databaseConfigured, getDatabasePool } from "./db";
import type { ApprovedMessageInput, CompleteActionInput, ConnectorEventInput } from "./validation";
import type { ApprovedAction, Channel, Customer, CustomerEvent, DashboardSnapshot, EventKind, MessageRecommendation, QueuedMessage } from "./types";

interface CustomerRow {
  internal_id: string;
  external_id: string;
  first_name: string;
  last_name: string;
  vehicle: string | null;
  source: string | null;
  intent: number | null;
  status: string | null;
  next_best_action: string | null;
  action_reason: string | null;
  vin_solutions_url: string | null;
  recommendation: unknown;
}

interface EventRow {
  id: string;
  customer_id: string;
  event_type: EventKind;
  event_data: Record<string, unknown>;
  timestamp: Date;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recommendation(value: unknown): MessageRecommendation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const confidence = typeof item.confidence === "number" ? item.confidence : NaN;
  const channel = item.channel === "SMS" || item.channel === "EMAIL" ? item.channel : null;
  const title = text(item.title);
  const reason = text(item.reason);
  const body = text(item.body);
  if (!title || !reason || !body || !channel || confidence < 0 || confidence > 1) return undefined;
  return { title, reason, body, channel, confidence };
}

function eventFromRow(row: EventRow): CustomerEvent {
  return {
    id: row.id,
    type: row.event_type,
    title: text(row.event_data.title) ?? row.event_type.replaceAll("_", " "),
    detail: text(row.event_data.detail) ?? "",
    channel: (text(row.event_data.channel) as Channel | null) ?? "CRM",
    timestamp: row.timestamp.toISOString(),
  };
}

function defaultAction(events: CustomerEvent[]): string {
  const latest = events[0];
  if (!latest) return "Review customer record";
  if (latest.type === "APPOINTMENT_CREATED") return "Confirm appointment";
  if (latest.type === "CUSTOMER_REPLIED") return "Review customer reply";
  if (latest.type === "HUMAN_HANDOFF") return "Manager follow-up required";
  return "Review recent activity";
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!databaseConfigured()) {
    return {
      customers: demoCustomers,
      stats: demoStats,
      runtime: {
        dataMode: "demo",
        state: "demo",
        label: "Demo data",
        detail: "PostgreSQL is not configured; no connector events or approved messages are persisted.",
        lastEventAt: null,
        pendingActions: 0,
      },
    };
  }

  try {
    const pool = getDatabasePool();
    const customerResult = await pool.query<CustomerRow>(`
      SELECT
        id::text AS internal_id,
        vin_solutions_customer_id AS external_id,
        first_name,
        last_name,
        vehicle_of_interest AS vehicle,
        lead_source AS source,
        intent_score AS intent,
        status,
        next_best_action,
        action_reason,
        vin_solutions_url,
        recommendation
      FROM customers
      WHERE vin_solutions_customer_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 100
    `);

    const ids = customerResult.rows.map((row) => row.internal_id);
    const eventResult = ids.length
      ? await pool.query<EventRow>(`
          SELECT id::text, customer_id::text, event_type, event_data, timestamp
          FROM customer_events
          WHERE customer_id = ANY($1::uuid[])
          ORDER BY timestamp DESC
        `, [ids])
      : { rows: [] as EventRow[] };

    const eventsByCustomer = new Map<string, CustomerEvent[]>();
    for (const row of eventResult.rows) {
      const events = eventsByCustomer.get(row.customer_id) ?? [];
      if (events.length < 25) events.push(eventFromRow(row));
      eventsByCustomer.set(row.customer_id, events);
    }

    const customers: Customer[] = customerResult.rows.map((row) => {
      const events = eventsByCustomer.get(row.internal_id) ?? [];
      return {
        id: row.external_id,
        initials: initials(row.first_name, row.last_name),
        name: `${row.first_name} ${row.last_name}`.trim(),
        vehicle: row.vehicle ?? "Vehicle not captured",
        source: row.source === "VINSOLUTIONS_BROWSER" ? "VinSolutions" : row.source ?? "VinSolutions",
        intent: row.intent ?? 0,
        status: row.status ?? "Needs review",
        reason: row.action_reason ?? events[0]?.detail ?? "Recent customer activity is available.",
        action: row.next_best_action ?? defaultAction(events),
        vinSolutionsUrl: row.vin_solutions_url ?? undefined,
        recommendation: recommendation(row.recommendation),
        events,
      };
    });

    const allEvents = customers.flatMap((customer) => customer.events);
    const lastEventAt = allEvents.reduce<string | null>((latest, event) => {
      if (!latest || new Date(event.timestamp).getTime() > new Date(latest).getTime()) return event.timestamp;
      return latest;
    }, null);
    const pendingResult = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM outbound_actions WHERE status = 'APPROVED'",
    );
    const pendingActions = Number(pendingResult.rows[0]?.count ?? 0);
    const conversations = allEvents.filter((event) => event.type === "AI_TEXT_SENT" || event.type === "CUSTOMER_REPLIED").length;
    const appointments = allEvents.filter((event) => event.type === "APPOINTMENT_CREATED").length;
    return {
      customers,
      stats: [
        { label: "Customers", value: String(customers.length), delta: "Live", caption: "loaded from PostgreSQL" },
        { label: "Conversations", value: String(conversations), delta: "Captured", caption: "messages on the timeline" },
        { label: "Appointments", value: String(appointments), delta: "Tracked", caption: "captured appointments" },
        { label: "Approved queue", value: String(pendingActions), delta: "Human", caption: "waiting for execution" },
      ],
      runtime: {
        dataMode: "database",
        state: "ready",
        label: "Database connected",
        detail: `${customers.length} customers loaded; ${pendingActions} approved actions are waiting for execution.`,
        lastEventAt,
        pendingActions,
      },
    };
  } catch (error) {
    console.error("Sarah database read failed", error instanceof Error ? error.message : "Unknown database error");
    return {
      customers: [],
      stats: [
        { label: "Customers", value: "—", delta: "Paused", caption: "database unavailable" },
        { label: "Conversations", value: "—", delta: "Paused", caption: "database unavailable" },
        { label: "Appointments", value: "—", delta: "Paused", caption: "database unavailable" },
        { label: "Approved queue", value: "—", delta: "Paused", caption: "database unavailable" },
      ],
      runtime: {
        dataMode: "database",
        state: "unavailable",
        label: "Database unavailable",
        detail: "Sarah could not read the configured PostgreSQL database. Live customer data is held back.",
        lastEventAt: null,
        pendingActions: 0,
      },
    };
  }
}

export async function persistConnectorEvent(input: ConnectorEventInput): Promise<{ duplicate: boolean }> {
  if (!databaseConfigured()) throw new Error("Connector persistence is not configured.");

  const pool = getDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customerResult = await client.query<{ id: string }>(`
      INSERT INTO customers (
        first_name, last_name, vin_solutions_customer_id, lead_source,
        vehicle_of_interest, intent_score, status, next_best_action,
        action_reason, vin_solutions_url, recommendation, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now())
      ON CONFLICT (vin_solutions_customer_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        lead_source = COALESCE(EXCLUDED.lead_source, customers.lead_source),
        vehicle_of_interest = COALESCE(EXCLUDED.vehicle_of_interest, customers.vehicle_of_interest),
        intent_score = COALESCE(EXCLUDED.intent_score, customers.intent_score),
        status = COALESCE(EXCLUDED.status, customers.status),
        next_best_action = COALESCE(EXCLUDED.next_best_action, customers.next_best_action),
        action_reason = COALESCE(EXCLUDED.action_reason, customers.action_reason),
        vin_solutions_url = COALESCE(EXCLUDED.vin_solutions_url, customers.vin_solutions_url),
        recommendation = COALESCE(EXCLUDED.recommendation, customers.recommendation),
        updated_at = now()
      RETURNING id::text
    `, [
      input.customer.firstName,
      input.customer.lastName,
      input.customer.externalId,
      input.dashboard?.leadSource ?? input.source,
      input.dashboard?.vehicle ?? null,
      input.dashboard?.intent ?? null,
      input.dashboard?.status ?? null,
      input.dashboard?.nextBestAction ?? null,
      input.dashboard?.reason ?? null,
      input.dashboard?.vinSolutionsUrl ?? null,
      JSON.stringify(input.dashboard?.recommendation ?? null),
    ]);

    const inserted = await client.query<{ id: string }>(`
      INSERT INTO customer_events (
        external_event_id, customer_id, event_type, event_source, event_data, timestamp, confidence_score
      ) VALUES ($1, $2::uuid, $3, $4, $5::jsonb, $6::timestamptz, $7)
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING id::text
    `, [
      input.eventId,
      customerResult.rows[0].id,
      input.event.type,
      input.source,
      JSON.stringify({ title: input.event.title, detail: input.event.detail, channel: input.event.channel }),
      input.occurredAt,
      input.dashboard?.recommendation?.confidence ?? null,
    ]);
    await client.query("COMMIT");
    return { duplicate: inserted.rowCount === 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function queueApprovedMessage(input: ApprovedMessageInput & { approvedBy: string }): Promise<QueuedMessage> {
  if (!databaseConfigured()) {
    return { actionId: `demo-${randomUUID()}`, mode: "demo", status: "DEMO_ONLY", duplicate: false };
  }

  const idempotencyKey = createHash("sha256")
    .update([input.customerId, input.channel, input.body, input.approvedBy].join("\u0000"))
    .digest("hex");
  const pool = getDatabasePool();
  const inserted = await pool.query<{ id: string }>(`
    INSERT INTO outbound_actions (customer_id, channel, message_text, approved_by, idempotency_key)
    SELECT id, $2, $3, $4, $5
    FROM customers
    WHERE vin_solutions_customer_id = $1
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id::text
  `, [input.customerId, input.channel, input.body, input.approvedBy, idempotencyKey]);

  if (inserted.rows[0]) {
    return { actionId: inserted.rows[0].id, mode: "database", status: "APPROVED", duplicate: false };
  }

  const existing = await pool.query<{ id: string; status: "APPROVED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" }>(
    "SELECT id::text, status::text FROM outbound_actions WHERE idempotency_key = $1 LIMIT 1",
    [idempotencyKey],
  );
  if (!existing.rows[0]) throw new Error("Customer was not found or the approved action could not be queued.");
  return {
    actionId: existing.rows[0].id,
    mode: "database",
    status: existing.rows[0].status === "SENT" ? "ALREADY_SENT" : existing.rows[0].status,
    duplicate: true,
  };
}

export async function loadApprovedActions(customerExternalId: string): Promise<{ mode: "demo" | "database"; actions: ApprovedAction[] }> {
  if (!databaseConfigured()) return { mode: "demo", actions: [] };
  const pool = getDatabasePool();
  const result = await pool.query<{
    action_id: string;
    customer_id: string;
    channel: "SMS" | "EMAIL";
    message_text: string;
    approved_by: string;
    created_at: Date;
  }>(`
    SELECT
      actions.id::text AS action_id,
      customers.vin_solutions_customer_id AS customer_id,
      actions.channel,
      actions.message_text,
      actions.approved_by,
      actions.created_at
    FROM outbound_actions actions
    JOIN customers ON customers.id = actions.customer_id
    WHERE customers.vin_solutions_customer_id = $1
      AND actions.status = 'APPROVED'
    ORDER BY actions.created_at
    LIMIT 10
  `, [customerExternalId]);
  return {
    mode: "database",
    actions: result.rows.map((row) => ({
      actionId: row.action_id,
      customerId: row.customer_id,
      channel: row.channel,
      body: row.message_text,
      approvedBy: row.approved_by,
      createdAt: row.created_at.toISOString(),
      status: "APPROVED",
    })),
  };
}

export async function completeApprovedAction(actionId: string, input: CompleteActionInput): Promise<{ status: "SENT" | "FAILED"; duplicate: boolean }> {
  if (!databaseConfigured()) throw new Error("Outbound action persistence is not configured.");
  const pool = getDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query<{ customer_id: string; channel: Channel; message_text: string }>(`
      UPDATE outbound_actions
      SET
        status = $2,
        external_message_id = $3,
        failure_reason = $4,
        attempted_at = now(),
        completed_at = now(),
        updated_at = now()
      WHERE id = $1::uuid AND status = 'APPROVED'
      RETURNING customer_id::text, channel, message_text
    `, [actionId, input.outcome, input.externalMessageId ?? null, input.failureReason ?? null]);

    if (updated.rows[0] && input.outcome === "SENT") {
      await client.query(`
        INSERT INTO customer_events (
          external_event_id, customer_id, event_type, event_source, event_data, timestamp
        ) VALUES ($1, $2::uuid, 'AI_TEXT_SENT', 'VINSOLUTIONS_BROWSER', $3::jsonb, now())
        ON CONFLICT (external_event_id) DO NOTHING
      `, [
        `outbound-action:${actionId}:sent`,
        updated.rows[0].customer_id,
        JSON.stringify({
          title: "Approved message sent",
          detail: updated.rows[0].message_text,
          channel: updated.rows[0].channel,
        }),
      ]);
      await client.query(`
        UPDATE customers
        SET
          recommendation = NULL,
          next_best_action = 'Review latest activity',
          action_reason = 'The approved draft was marked sent in VinSolutions.',
          updated_at = now()
        WHERE id = $1::uuid
      `, [updated.rows[0].customer_id]);
    }

    if (!updated.rows[0]) {
      const existing = await client.query<{ status: string }>(
        "SELECT status::text FROM outbound_actions WHERE id = $1::uuid LIMIT 1",
        [actionId],
      );
      if (existing.rows[0]?.status !== input.outcome) throw new Error("Approved action was not found or is no longer pending.");
    }
    await client.query("COMMIT");
    return { status: input.outcome, duplicate: !updated.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

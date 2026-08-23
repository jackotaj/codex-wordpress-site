import { NextResponse } from "next/server";
import type { ConnectorEventEnvelope } from "@/lib/connectors/types";

function isEnvelope(value: unknown): value is ConnectorEventEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<ConnectorEventEnvelope>;
  return Boolean(envelope.eventId && envelope.occurredAt && envelope.source && envelope.customer?.externalId && envelope.event?.type);
}

export async function POST(request: Request) {
  if (process.env.CONNECTOR_SHARED_SECRET && request.headers.get("x-connector-secret") !== process.env.CONNECTOR_SHARED_SECRET) {
    return NextResponse.json({ error: "Unauthorized connector" }, { status: 401 });
  }

  const payload: unknown = await request.json();
  if (!isEnvelope(payload)) return NextResponse.json({ error: "Invalid event envelope" }, { status: 400 });

  // Phase 1 validates the browser connector contract. The production adapter
  // persists this envelope and de-duplicates on eventId in PostgreSQL.
  return NextResponse.json({ accepted: true, eventId: payload.eventId }, { status: 202 });
}

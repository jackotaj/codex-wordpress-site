import { NextResponse } from "next/server";
import { connectorAuthConfigured, verifyConnectorSecret } from "@/lib/connector-auth";
import { persistConnectorEvent } from "@/lib/repository";
import { connectorEventEnvelopeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!connectorAuthConfigured()) return NextResponse.json({ error: "Connector authentication is not configured" }, { status: 503 });
  if (!verifyConnectorSecret(request.headers.get("x-connector-secret"))) {
    return NextResponse.json({ error: "Unauthorized connector" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = connectorEventEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event envelope", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await persistConnectorEvent(parsed.data);
    return NextResponse.json({ accepted: true, duplicate: result.duplicate, eventId: parsed.data.eventId }, { status: 202 });
  } catch (error) {
    console.error("Connector event persistence failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Connector event was not persisted" }, { status: 503 });
  }
}

import { NextResponse } from "next/server";

import { connectorAuthConfigured, verifyConnectorSecret } from "@/lib/connector-auth";
import { completeApprovedAction } from "@/lib/repository";
import { completeActionSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ actionId: string }> }) {
  if (!connectorAuthConfigured()) return NextResponse.json({ error: "Connector authentication is not configured" }, { status: 503 });
  if (!verifyConnectorSecret(request.headers.get("x-connector-secret"))) {
    return NextResponse.json({ error: "Unauthorized connector" }, { status: 401 });
  }
  const { actionId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(actionId)) return NextResponse.json({ error: "Invalid action id" }, { status: 400 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = completeActionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid completion", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    return NextResponse.json(await completeApprovedAction(actionId, parsed.data));
  } catch (error) {
    console.error("Approved action completion failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Approved action was not completed" }, { status: 409 });
  }
}

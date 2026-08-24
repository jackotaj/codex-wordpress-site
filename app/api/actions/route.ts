import { NextResponse } from "next/server";

import { connectorAuthConfigured, verifyConnectorSecret } from "@/lib/connector-auth";
import { loadApprovedActions } from "@/lib/repository";

export async function GET(request: Request) {
  if (!connectorAuthConfigured()) return NextResponse.json({ error: "Connector authentication is not configured" }, { status: 503 });
  if (!verifyConnectorSecret(request.headers.get("x-connector-secret"))) {
    return NextResponse.json({ error: "Unauthorized connector" }, { status: 401 });
  }
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId || customerId.length > 240) {
    return NextResponse.json({ error: "A valid customerId is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await loadApprovedActions(customerId));
  } catch (error) {
    console.error("Approved action read failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Approved actions could not be loaded" }, { status: 503 });
  }
}

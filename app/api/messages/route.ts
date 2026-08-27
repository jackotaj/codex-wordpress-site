import { NextResponse } from "next/server";

import { getManagerSession } from "@/lib/auth";
import { queueApprovedMessage } from "@/lib/repository";
import { approvedMessageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getManagerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = approvedMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approved message", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await queueApprovedMessage({ ...parsed.data, approvedBy: session.displayName });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    console.error("Approved message queue failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Approved message was not queued" }, { status: 503 });
  }
}

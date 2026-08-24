import { NextResponse } from "next/server";
import { recommendNextAction } from "@/lib/decision-engine";
import { engagementContextSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = engagementContextSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid engagement context", issues: parsed.error.issues }, { status: 400 });
  }
  return NextResponse.json(recommendNextAction(parsed.data));
}

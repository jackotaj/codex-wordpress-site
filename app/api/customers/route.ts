import { NextResponse } from "next/server";

import { getManagerSession } from "@/lib/auth";
import { loadDashboardSnapshot } from "@/lib/repository";

export async function GET() {
  if (!await getManagerSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const snapshot = await loadDashboardSnapshot();
  return NextResponse.json(snapshot, { status: snapshot.runtime.state === "unavailable" ? 503 : 200 });
}

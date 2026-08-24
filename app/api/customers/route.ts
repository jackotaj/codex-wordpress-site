import { NextResponse } from "next/server";

import { loadDashboardSnapshot } from "@/lib/repository";

export async function GET() {
  const snapshot = await loadDashboardSnapshot();
  return NextResponse.json(snapshot, { status: snapshot.runtime.state === "unavailable" ? 503 : 200 });
}

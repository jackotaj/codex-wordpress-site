import { NextResponse } from "next/server";
import { recommendNextAction, type EngagementContext } from "@/lib/decision-engine";

export async function POST(request: Request) {
  const context = (await request.json()) as EngagementContext;
  return NextResponse.json(recommendNextAction(context));
}

import { NextResponse } from "next/server";

import { createManagerSessionToken, isManagerAuthConfigured, MANAGER_SESSION_COOKIE, verifyManagerAccessCode } from "@/lib/auth";
import { managerLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isManagerAuthConfigured()) {
    return NextResponse.json({ error: "Manager access is not configured" }, { status: 503 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = managerLoginSchema.safeParse(payload);
  if (!parsed.success || !verifyManagerAccessCode(parsed.data.accessCode)) {
    return NextResponse.json({ error: "Access code is incorrect" }, { status: 401 });
  }
  const { token, expiresAt } = createManagerSessionToken();
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(MANAGER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
    priority: "high",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(MANAGER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}

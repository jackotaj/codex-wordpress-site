import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const MANAGER_SESSION_COOKIE = "sarah_manager_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export interface ManagerSession {
  displayName: string;
  expiresAt: number;
}

function accessSecret(): string | null {
  const secret = process.env.MANAGER_ACCESS_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function equalStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isManagerAuthConfigured(): boolean {
  return Boolean(accessSecret());
}

export function verifyManagerAccessCode(candidate: string): boolean {
  const secret = accessSecret();
  return Boolean(secret && equalStrings(candidate, secret));
}

export function createManagerSessionToken(now = Date.now()): { token: string; expiresAt: number } {
  const secret = accessSecret();
  if (!secret) throw new Error("MANAGER_ACCESS_SECRET must contain at least 32 characters.");
  const expiresAt = now + SESSION_DURATION_MS;
  const payload = `v1.${expiresAt}`;
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifyManagerSessionToken(token: string | undefined, now = Date.now()): ManagerSession | null {
  const secret = accessSecret();
  if (!secret || !token) return null;
  const [version, expiresText, signature, extra] = token.split(".");
  const expiresAt = Number(expiresText);
  if (version !== "v1" || extra || !signature || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return null;
  const payload = `${version}.${expiresText}`;
  if (!equalStrings(signature, sign(payload, secret))) return null;
  return { displayName: process.env.MANAGER_NAME?.trim() || "Todd Jacob", expiresAt };
}

export async function getManagerSession(): Promise<ManagerSession | null> {
  if (process.env.NODE_ENV === "development" && !isManagerAuthConfigured()) {
    return { displayName: process.env.MANAGER_NAME?.trim() || "Todd Jacob", expiresAt: Number.MAX_SAFE_INTEGER };
  }
  const token = (await cookies()).get(MANAGER_SESSION_COOKIE)?.value;
  return verifyManagerSessionToken(token);
}

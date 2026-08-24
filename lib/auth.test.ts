import { afterEach, describe, expect, it } from "vitest";

import { createManagerSessionToken, verifyManagerAccessCode, verifyManagerSessionToken } from "./auth";

const originalSecret = process.env.MANAGER_ACCESS_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.MANAGER_ACCESS_SECRET;
  else process.env.MANAGER_ACCESS_SECRET = originalSecret;
});

describe("manager sessions", () => {
  it("accepts the configured access code and a valid signed session", () => {
    process.env.MANAGER_ACCESS_SECRET = "a-secure-manager-access-code-that-is-long-enough";
    expect(verifyManagerAccessCode(process.env.MANAGER_ACCESS_SECRET)).toBe(true);
    const session = createManagerSessionToken(1_000);
    expect(verifyManagerSessionToken(session.token, 2_000)?.expiresAt).toBe(session.expiresAt);
  });

  it("rejects incorrect access codes and tampered sessions", () => {
    process.env.MANAGER_ACCESS_SECRET = "a-secure-manager-access-code-that-is-long-enough";
    expect(verifyManagerAccessCode("wrong-code")).toBe(false);
    const { token } = createManagerSessionToken(1_000);
    expect(verifyManagerSessionToken(`${token}tampered`, 2_000)).toBeNull();
  });

  it("rejects expired sessions", () => {
    process.env.MANAGER_ACCESS_SECRET = "a-secure-manager-access-code-that-is-long-enough";
    const { token, expiresAt } = createManagerSessionToken(1_000);
    expect(verifyManagerSessionToken(token, expiresAt)).toBeNull();
  });
});

import { afterEach, describe, expect, it } from "vitest";

import { connectorAuthConfigured, verifyConnectorSecret } from "./connector-auth";

const originalSecret = process.env.CONNECTOR_SHARED_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CONNECTOR_SHARED_SECRET;
  else process.env.CONNECTOR_SHARED_SECRET = originalSecret;
});

describe("connector authentication", () => {
  it("fails closed when no shared secret is configured", () => {
    delete process.env.CONNECTOR_SHARED_SECRET;
    expect(connectorAuthConfigured()).toBe(false);
    expect(verifyConnectorSecret("anything")).toBe(false);
  });

  it("accepts only the exact configured secret", () => {
    process.env.CONNECTOR_SHARED_SECRET = "connector-test-secret";
    expect(verifyConnectorSecret("connector-test-secret")).toBe(true);
    expect(verifyConnectorSecret("connector-test-secret-wrong")).toBe(false);
  });
});

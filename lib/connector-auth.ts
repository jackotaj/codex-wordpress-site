import { timingSafeEqual } from "node:crypto";

export function connectorAuthConfigured(): boolean {
  return Boolean(process.env.CONNECTOR_SHARED_SECRET?.trim());
}

export function verifyConnectorSecret(candidate: string | null): boolean {
  const expected = process.env.CONNECTOR_SHARED_SECRET?.trim();
  if (!expected || !candidate) return false;
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

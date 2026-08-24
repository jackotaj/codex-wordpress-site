# Sarah — Dealership AI Revenue Assistant

Phase 1 pilot dashboard for Safford Hyundai Leesburg. Sarah turns dealership activity into a durable customer timeline, recommends safe next actions, and keeps a human manager in control.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without `DATABASE_URL`, Sarah runs in an explicitly labeled demo mode. Demo approvals are not stored or reported as sent.

To enable persistence, create a PostgreSQL database, apply `database/schema.sql`, and set `DATABASE_URL`. The server connection must use a role allowed to access the RLS-protected tables. Set a strong `CONNECTOR_SHARED_SECRET` before accepting connector events.

## Architecture

- **Dashboard:** Next.js App Router and TypeScript.
- **Intelligence layer:** channel-agnostic decision engine in `lib/decision-engine.ts`.
- **CRM boundary:** `CRMConnector` contract in `lib/connectors/types.ts`; browser and future official API adapters implement the same interface.
- **Source of truth:** append-only `customer_events` timeline in `database/schema.sql`.
- **Controlled actions:** manager-approved SMS and email drafts enter an idempotent outbound-action queue; approval is not treated as external delivery.
- **Extension seam:** the included Chrome extension currently captures VinSolutions page context locally. Its live event submission and dealership-specific field mapping still require validation in the authenticated VinSolutions workflow.

## Current boundary

The dashboard, decision engine, event persistence, and approval queue are implemented. Real VinSolutions delivery is not implemented and is never simulated as successful. The production app still needs manager authentication, an initialized PostgreSQL database, and a validated connector before dealership use.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

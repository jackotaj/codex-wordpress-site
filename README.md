# Sarah — Dealership AI Revenue Assistant

Phase 1 pilot dashboard for Safford Hyundai Leesburg. Sarah turns dealership activity into a durable customer timeline, recommends safe next actions, and keeps a human manager in control.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The prototype ships with representative pilot data; connect PostgreSQL and implement a `CRMConnector` adapter when moving beyond the demo.

## Architecture

- **Dashboard:** Next.js App Router and TypeScript.
- **Intelligence layer:** channel-agnostic decision engine in `lib/decision-engine.ts`.
- **CRM boundary:** `CRMConnector` contract in `lib/connectors/types.ts`; browser and future official API adapters implement the same interface.
- **Source of truth:** append-only `customer_events` timeline in `database/schema.sql`.
- **Controlled actions:** recommendations are reviewed in the manager UI before communication is sent.
- **Extension seam:** the Chrome extension captures normalized events and submits them to `/api/events`; it does not own business logic.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

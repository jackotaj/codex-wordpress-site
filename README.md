# Sarah — Dealership AI Revenue Assistant

Phase 1 pilot dashboard for Safford Hyundai Leesburg. Sarah turns dealership activity into a durable customer timeline, recommends safe next actions, and keeps a human manager in control.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without `DATABASE_URL`, Sarah runs in an explicitly labeled demo mode. Demo approvals are not stored or reported as sent.

In production, configure all four server-only values in `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string. Use a serverless transaction-pooler URL on Vercel.
- `CONNECTOR_SHARED_SECRET`: high-entropy secret shared only with the Chrome connector.
- `MANAGER_ACCESS_SECRET`: manager access code with at least 32 characters.
- `MANAGER_NAME`: the manager name shown in the app and audit records.

To enable persistence, create a PostgreSQL database, apply `database/schema.sql`, and set `DATABASE_URL`. The server connection must use a role allowed to access the RLS-protected tables. Production manager access fails closed when `MANAGER_ACCESS_SECRET` is absent or too short; local development without it uses an explicit development-only bypass.

## Architecture

- **Dashboard:** Next.js App Router and TypeScript.
- **Intelligence layer:** channel-agnostic decision engine in `lib/decision-engine.ts`.
- **CRM boundary:** `CRMConnector` contract in `lib/connectors/types.ts`; browser and future official API adapters implement the same interface.
- **Source of truth:** append-only `customer_events` timeline in `database/schema.sql`.
- **Controlled actions:** manager-approved SMS and email drafts enter an idempotent outbound-action queue; approval is not treated as external delivery.
- **Extension:** the Chrome connector submits authenticated, idempotent customer events and presents manager-approved drafts inside VinSolutions. It never enters credentials, edits CRM fields, or clicks the CRM Send button.

## Install the Chrome connector

1. Open `chrome://extensions`, turn on **Developer mode**, and choose **Load unpacked**.
2. Select the repository's `extension` folder.
3. Click the Sarah extension icon to open settings.
4. Enter the deployed Sarah URL and the matching `CONNECTOR_SHARED_SECRET`.
5. Enter only VinSolutions CSS selectors that have been verified in the dealership's current authenticated page, then choose **Save and test connection**.

When Sarah has an approved draft for the open customer, the connector displays it in a small panel. The manager copies the draft, sends it in VinSolutions, and then explicitly marks it sent. That confirmation closes the queue item and writes an append-only timeline event.

## Current boundary

The dashboard, manager access, decision engine, event persistence, approval queue, and manual VinSolutions completion flow are implemented. Automated VinSolutions delivery is intentionally not implemented and is never simulated as successful. Dealership use still requires an initialized PostgreSQL database, a deployed app with secrets, and one live authenticated VinSolutions selector-validation session.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

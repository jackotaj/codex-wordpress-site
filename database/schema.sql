CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE communication_channel AS ENUM ('SMS', 'EMAIL', 'CALL', 'CRM');
CREATE TYPE sender_kind AS ENUM ('AI', 'HUMAN', 'CUSTOMER');

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  vin_solutions_customer_id text UNIQUE,
  lead_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  channel communication_channel NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  ai_active boolean NOT NULL DEFAULT true,
  assigned_user text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  sender_type sender_kind NOT NULL,
  channel communication_channel NOT NULL,
  message_text text NOT NULL,
  external_message_id text,
  approved_by text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Append-only activity ledger and the canonical source for the customer timeline.
CREATE TABLE customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_event_id text UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  event_type text NOT NULL,
  event_source text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  confidence_score numeric(4,3) CHECK (confidence_score BETWEEN 0 AND 1)
);

CREATE INDEX customer_events_timeline_idx ON customer_events (customer_id, timestamp DESC);
CREATE INDEX conversations_customer_idx ON conversations (customer_id, created_at DESC);

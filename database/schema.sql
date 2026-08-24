CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE communication_channel AS ENUM ('SMS', 'EMAIL', 'CALL', 'CRM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sender_kind AS ENUM ('AI', 'HUMAN', 'CUSTOMER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE outbound_action_status AS ENUM ('APPROVED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  vin_solutions_customer_id text UNIQUE,
  lead_source text,
  vehicle_of_interest text,
  intent_score integer CHECK (intent_score BETWEEN 0 AND 100),
  status text,
  next_best_action text,
  action_reason text,
  vin_solutions_url text,
  recommendation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS vehicle_of_interest text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS intent_score integer CHECK (intent_score BETWEEN 0 AND 100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_best_action text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS action_reason text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vin_solutions_url text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS recommendation jsonb;

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  channel communication_channel NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  ai_active boolean NOT NULL DEFAULT true,
  assigned_user text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
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
CREATE TABLE IF NOT EXISTS customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_event_id text UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  event_type text NOT NULL,
  event_source text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  confidence_score numeric(4,3) CHECK (confidence_score BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS outbound_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  channel communication_channel NOT NULL CHECK (channel IN ('SMS', 'EMAIL')),
  message_text text NOT NULL,
  approved_by text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status outbound_action_status NOT NULL DEFAULT 'APPROVED',
  external_message_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_events_timeline_idx ON customer_events (customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS conversations_customer_idx ON conversations (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS outbound_actions_status_idx ON outbound_actions (status, created_at);
CREATE INDEX IF NOT EXISTS outbound_actions_customer_idx ON outbound_actions (customer_id);

CREATE OR REPLACE FUNCTION reject_customer_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'customer_events is append-only';
END;
$$;

ALTER FUNCTION reject_customer_event_mutation() SET search_path = '';

DROP TRIGGER IF EXISTS customer_events_append_only ON customer_events;
CREATE TRIGGER customer_events_append_only
BEFORE UPDATE OR DELETE ON customer_events
FOR EACH ROW EXECUTE FUNCTION reject_customer_event_mutation();

-- These tables are server-only. Supabase anon/authenticated clients receive no policies.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_actions ENABLE ROW LEVEL SECURITY;

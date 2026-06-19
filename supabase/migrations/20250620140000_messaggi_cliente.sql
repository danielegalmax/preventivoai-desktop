-- Template messaggi WhatsApp / Email (condividi PDF, invio firma, reminder firma)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS messaggi_cliente jsonb NOT NULL DEFAULT '{}'::jsonb;

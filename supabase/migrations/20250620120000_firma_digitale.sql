-- Firma digitale preventivo v1
-- Eseguire su Supabase SQL Editor (prod) prima del deploy backend/app.

CREATE TABLE IF NOT EXISTS preventivo_invii (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id uuid NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  link_token text NOT NULL,
  canale text CHECK (canale IN ('whatsapp', 'email', 'link')),
  inviato_at timestamptz NOT NULL DEFAULT now(),
  scade_at timestamptz NOT NULL,
  firmato_at timestamptz,
  revocato_at timestamptz,
  firma_immagine_url text,
  pdf_firmato_url text,
  audit_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  reminder_disabilitato boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventivo_invii_preventivo
  ON preventivo_invii (preventivo_id, inviato_at DESC);

CREATE INDEX IF NOT EXISTS idx_preventivo_invii_user_attivi
  ON preventivo_invii (user_id, scade_at)
  WHERE firmato_at IS NULL AND revocato_at IS NULL;

CREATE TABLE IF NOT EXISTS preventivo_invii_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invio_id uuid NOT NULL REFERENCES preventivo_invii(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('invio_iniziale', 'reminder_whatsapp', 'reminder_email')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventivo_invii_eventi_invio
  ON preventivo_invii_eventi (invio_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifiche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('firma_ricevuta', 'reminder_firma')),
  preventivo_id uuid REFERENCES preventivi(id) ON DELETE CASCADE,
  invio_id uuid REFERENCES preventivo_invii(id) ON DELETE SET NULL,
  titolo text NOT NULL,
  messaggio text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  letta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifiche_user_non_lette
  ON notifiche (user_id, created_at DESC)
  WHERE letta = false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reminder_firma_giorni integer NOT NULL DEFAULT 3;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reminder_firma_globale_disabilitato boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE preventivo_invii ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivo_invii_eventi ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;

CREATE POLICY preventivo_invii_select_own ON preventivo_invii
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY preventivo_invii_insert_own ON preventivo_invii
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY preventivo_invii_update_own ON preventivo_invii
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY notifiche_select_own ON notifiche
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifiche_update_own ON notifiche
  FOR UPDATE USING (auth.uid() = user_id);

-- Eventi: lettura via join invio (artigiano)
CREATE POLICY preventivo_invii_eventi_select ON preventivo_invii_eventi
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM preventivo_invii i
      WHERE i.id = invio_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY preventivo_invii_eventi_insert ON preventivo_invii_eventi
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM preventivo_invii i
      WHERE i.id = invio_id AND i.user_id = auth.uid()
    )
  );

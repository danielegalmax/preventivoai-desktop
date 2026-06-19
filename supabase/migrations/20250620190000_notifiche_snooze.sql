-- Snooze «Rimanda» per notifiche campanella
ALTER TABLE notifiche
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifiche_snooze
  ON notifiche (user_id, snooze_until)
  WHERE letta = false AND snooze_until IS NOT NULL;

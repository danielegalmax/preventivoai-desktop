-- Cestino: soft delete con retention 7 giorni
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE abbonamenti ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_preventivi_cestino
  ON preventivi (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_abbonamenti_cestino
  ON abbonamenti (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

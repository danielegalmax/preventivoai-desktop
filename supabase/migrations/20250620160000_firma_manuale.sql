-- Firma manuale: artigiano segna firmato a mano o carica scan/PDF

ALTER TABLE preventivo_invii DROP CONSTRAINT IF EXISTS preventivo_invii_canale_check;
ALTER TABLE preventivo_invii ADD CONSTRAINT preventivo_invii_canale_check
  CHECK (canale IS NULL OR canale IN ('whatsapp', 'email', 'link', 'manuale'));

ALTER TABLE preventivo_invii
  ADD COLUMN IF NOT EXISTS metodo_firma text;

ALTER TABLE preventivo_invii DROP CONSTRAINT IF EXISTS preventivo_invii_metodo_firma_check;
ALTER TABLE preventivo_invii ADD CONSTRAINT preventivo_invii_metodo_firma_check
  CHECK (metodo_firma IS NULL OR metodo_firma IN ('online', 'manuale'));

ALTER TABLE preventivo_invii_eventi DROP CONSTRAINT IF EXISTS preventivo_invii_eventi_tipo_check;
ALTER TABLE preventivo_invii_eventi ADD CONSTRAINT preventivo_invii_eventi_tipo_check
  CHECK (tipo IN ('invio_iniziale', 'reminder_whatsapp', 'reminder_email', 'firma_manuale'));

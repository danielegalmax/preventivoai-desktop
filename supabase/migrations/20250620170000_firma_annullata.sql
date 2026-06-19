-- Annullamento firma online da artigiano

ALTER TABLE preventivo_invii_eventi DROP CONSTRAINT IF EXISTS preventivo_invii_eventi_tipo_check;
ALTER TABLE preventivo_invii_eventi ADD CONSTRAINT preventivo_invii_eventi_tipo_check
  CHECK (tipo IN ('invio_iniziale', 'reminder_whatsapp', 'reminder_email', 'firma_manuale', 'firma_annullata'));

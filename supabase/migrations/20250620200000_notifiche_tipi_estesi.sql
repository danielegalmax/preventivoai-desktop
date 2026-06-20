-- Estende i tipi ammessi per le notifiche in-app (rate / pagamenti)

ALTER TABLE notifiche DROP CONSTRAINT IF EXISTS notifiche_tipo_check;

ALTER TABLE notifiche
  ADD CONSTRAINT notifiche_tipo_check
  CHECK (tipo IN (
    'firma_ricevuta',
    'reminder_firma',
    'rata_in_scadenza',
    'pagamento_ricevuto'
  ));

-- Realtime: aggiornamento badge firma e stato preventivo senza refresh

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'preventivo_invii'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.preventivo_invii;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'preventivi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.preventivi;
  END IF;
END $$;

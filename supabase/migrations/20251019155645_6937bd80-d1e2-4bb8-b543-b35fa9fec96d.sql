-- Phase 1: Enable realtime on rvt_seats table
ALTER TABLE public.rvt_seats REPLICA IDENTITY FULL;

-- The table will be added to realtime publication via Supabase dashboard settings
COMMENT ON TABLE public.rvt_seats IS 'Realtime enabled for seat tracking';
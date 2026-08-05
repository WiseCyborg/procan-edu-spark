ALTER TABLE public._cleanup_bak_20260731 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._cleanup_bak_ent_20260731 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._cleanup_bak_orgs_20260731 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._cleanup_bak_purch_20260731 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._cleanup_bak_vpublic_20260803 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public._cleanup_bak_20260731 FROM anon, authenticated;
REVOKE ALL ON public._cleanup_bak_ent_20260731 FROM anon, authenticated;
REVOKE ALL ON public._cleanup_bak_orgs_20260731 FROM anon, authenticated;
REVOKE ALL ON public._cleanup_bak_purch_20260731 FROM anon, authenticated;
REVOKE ALL ON public._cleanup_bak_vpublic_20260803 FROM anon, authenticated;

GRANT ALL ON public._cleanup_bak_20260731 TO service_role;
GRANT ALL ON public._cleanup_bak_ent_20260731 TO service_role;
GRANT ALL ON public._cleanup_bak_orgs_20260731 TO service_role;
GRANT ALL ON public._cleanup_bak_purch_20260731 TO service_role;
GRANT ALL ON public._cleanup_bak_vpublic_20260803 TO service_role;
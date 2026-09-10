REVOKE ALL ON FUNCTION public.wcbn_has_permission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wcbn_has_permission(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.wcbn_has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wcbn_has_permission(uuid, text) TO service_role;
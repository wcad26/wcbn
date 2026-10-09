-- Allow WCBN leaders (with members.manage permission or super admins) to delete/unregister WCBN memberships for resetting test accounts
CREATE POLICY "WCBN leaders delete memberships" ON public.wcbn_members
  FOR DELETE TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'members.manage') OR public.is_super_admin_user(auth.uid()));

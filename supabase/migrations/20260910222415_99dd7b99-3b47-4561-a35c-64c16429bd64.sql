
CREATE POLICY "WCBN staff manage applications" ON public.wcbn_applications
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'applications.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'applications.manage'));

CREATE POLICY "WCBN staff manage businesses" ON public.wcbn_businesses
  FOR ALL TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'businesses.manage'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'businesses.manage'));

CREATE POLICY "WCBN staff manage member records" ON public.wcbn_members
  FOR UPDATE TO authenticated
  USING (public.wcbn_has_permission(auth.uid(), 'members.view'))
  WITH CHECK (public.wcbn_has_permission(auth.uid(), 'members.view'));

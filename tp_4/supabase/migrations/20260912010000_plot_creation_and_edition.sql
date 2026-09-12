-- Allow producers and operators to create and edit plots (RF-07)
grant insert (organization_id, name, crop, boundary, threshold_min, threshold_max)
  on public.plots to authenticated;

grant update (name, crop, boundary)
  on public.plots to authenticated;

create policy "Producers and operators can insert plots"
  on public.plots for insert to authenticated
  with check (public.can_operate_organization(organization_id));

create policy "Producers and operators can update plot metadata"
  on public.plots for update to authenticated
  using (public.can_operate_organization(organization_id))
  with check (public.can_operate_organization(organization_id));

-- ====================================================================
-- AgroPulse Migration: Support notes and GPS for manual readings (RF-21)
-- ====================================================================

alter table public.readings
  add column if not exists notes text,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6);

grant insert (notes, latitude, longitude)
  on public.readings to authenticated;

-- LOCAL TEST ONLY: These are regular authenticated users for local development.
-- They are not service-role credentials. Password for every account: AgroPulseTest!2026

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'producer@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Producer"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operator@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Operator"}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'advisor@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Advisor"}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Outsider"}', now(), now())
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"producer@agropulse.test"}', 'email', 'producer@agropulse.test', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"operator@agropulse.test"}', 'email', 'operator@agropulse.test', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"advisor@agropulse.test"}', 'email', 'advisor@agropulse.test', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"outsider@agropulse.test"}', 'email', 'outsider@agropulse.test', now(), now())
on conflict (id) do update set
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

insert into public.organizations (id, name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Estancia Didáctica Concordia'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Granja de Pruebas Aislada');

insert into public.memberships (organization_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'producer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'advisor'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'advisor');
insert into public.plots (id, organization_id, name, crop, boundary, threshold_min, threshold_max)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Costa 1', 'Citrus', '{"type":"Polygon","coordinates":[[[-58.3980,-31.3920],[-58.3970,-31.3920],[-58.3970,-31.3910],[-58.3980,-31.3910],[-58.3980,-31.3920]]]}', 25, 45),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Costa 2', 'Citrus', '{"type":"Polygon","coordinates":[[[-58.3968,-31.3920],[-58.3958,-31.3920],[-58.3958,-31.3910],[-58.3968,-31.3910],[-58.3968,-31.3920]]]}', 25, 45),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Monte A', 'Soja', '{"type":"Polygon","coordinates":[[[-58.3980,-31.3908],[-58.3970,-31.3908],[-58.3970,-31.3898],[-58.3980,-31.3898],[-58.3980,-31.3908]]]}', 25, 45);

insert into public.stations (id, plot_id, name, external_id)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Costa 1 Station', 'local-costa-1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Costa 2 Station', 'local-costa-2'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Monte A Station', 'local-monte-a');

insert into public.valves (id, plot_id, station_id, name, state)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Costa 1 Valve', 'closed'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Costa 2 Valve', 'open'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'Monte A Valve', 'closed');

insert into public.readings (station_id, measured_at, source, soil_moisture_pct, air_temperature_c)
select
  station.id,
  now() - sample.age,
  'sensor',
  sample.moisture,
  sample.temperature
from (
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '5 hours 30 minutes', 37.5::numeric, 23.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '5 hours', 37.8::numeric, 23.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '4 hours 30 minutes', 38.1::numeric, 24.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '4 hours', 38.0::numeric, 25.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '3 hours 30 minutes', 37.7::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '3 hours', 37.4::numeric, 26.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '2 hours 30 minutes', 37.2::numeric, 26.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '2 hours', 37.4::numeric, 26.5::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '1 hour 30 minutes', 37.7::numeric, 26.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '1 hour', 37.9::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '30 minutes', 38.0::numeric, 25.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '0 minutes', 37.8::numeric, 24.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '5 hours 30 minutes', 22.1::numeric, 23.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '5 hours', 21.8::numeric, 23.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '4 hours 30 minutes', 21.4::numeric, 24.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '4 hours', 21.0::numeric, 25.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '3 hours 30 minutes', 20.7::numeric, 25.6::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '3 hours', 20.3::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '2 hours 30 minutes', 19.9::numeric, 26.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '2 hours', 19.7::numeric, 26.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '1 hour 30 minutes', 19.4::numeric, 26.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '1 hour', 19.1::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '30 minutes', 18.9::numeric, 25.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '0 minutes', 18.7::numeric, 24.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 45 minutes', 31.5::numeric, 22.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 30 minutes', 31.3::numeric, 23.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 15 minutes', 31.0::numeric, 23.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours', 30.8::numeric, 24.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 45 minutes', 30.5::numeric, 24.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 30 minutes', 30.2::numeric, 25.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 15 minutes', 30.0::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours', 29.8::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 45 minutes', 29.6::numeric, 25.6::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 30 minutes', 29.5::numeric, 25.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 15 minutes', 29.3::numeric, 24.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours', 29.2::numeric, 24.3::numeric)
  ) as sample(station_id, age, moisture, temperature)
join public.stations as station on station.id = sample.station_id;

insert into public.alerts (plot_id, message, severity)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'La humedad del suelo está por debajo del umbral mínimo configurado.', 'warning');

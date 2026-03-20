-- =============================================================
-- Seed data for local development and PR preview branches
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING
-- =============================================================

-- Test owner account (password: testpassword123)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'owner@test.bukarrum.com',
  crypt('testpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Owner"}',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- BUSINESS
-- =============================================================
INSERT INTO businesses (id, owner_id, name, slug, description) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Estudio Test',
  'estudio-test',
  'Estudio de ensayo y grabación para pruebas de preview'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- LOCATION
-- =============================================================
INSERT INTO locations (id, business_id, name, address, description) VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Sede Principal',
  'Av. Providencia 1234, Santiago',
  'Sede principal del estudio'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- RESOURCES
-- =============================================================
INSERT INTO resources (id, location_id, type, name, description, hourly_rate, capacity) VALUES
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    'room',
    'Sala A — Ensayo',
    'Sala de ensayo con batería, amplificadores y PA',
    12000,
    8
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000020',
    'room',
    'Sala B — Grabación',
    'Sala de grabación profesional con cabina de control',
    25000,
    4
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000020',
    'equipment',
    'Micrófono Shure SM7B',
    'Micrófono dinámico profesional para voz y grabación',
    5000,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- AVAILABILITY  (Mon–Fri 09:00–22:00, Sat 10:00–20:00)
-- day_of_week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
-- =============================================================
INSERT INTO availability (resource_id, day_of_week, open_time, close_time) VALUES
  -- Sala A
  ('00000000-0000-0000-0000-000000000030', 1, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000030', 2, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000030', 3, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000030', 4, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000030', 5, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000030', 6, '10:00', '20:00'),
  -- Sala B
  ('00000000-0000-0000-0000-000000000031', 1, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000031', 2, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000031', 3, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000031', 4, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000031', 5, '09:00', '22:00'),
  ('00000000-0000-0000-0000-000000000031', 6, '10:00', '20:00')
ON CONFLICT DO NOTHING;

-- =============================================================
-- BOOKING GROUP + BOOKINGS
-- =============================================================
INSERT INTO booking_groups (id) VALUES
  ('00000000-0000-0000-0000-000000000040')
ON CONFLICT (id) DO NOTHING;

-- Confirmed booking: Sala A, 2 hours, 3 days from epoch reference
-- Using a fixed future date so this remains valid after deploy
INSERT INTO bookings (
  id,
  booking_group_id,
  resource_id,
  location_id,
  business_id,
  client_name,
  client_email,
  client_phone,
  start_time,
  end_time,
  total_price,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Juan Pérez',
  'juan@test.com',
  '+56912345678',
  '2030-01-15 14:00:00+00',
  '2030-01-15 16:00:00+00',
  24000,
  'confirmed'
) ON CONFLICT (id) DO NOTHING;

-- Pending booking: Sala B, 1 hour
INSERT INTO bookings (
  id,
  booking_group_id,
  resource_id,
  location_id,
  business_id,
  client_name,
  client_email,
  client_phone,
  start_time,
  end_time,
  total_price,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'María González',
  'maria@test.com',
  '+56987654321',
  '2030-01-16 10:00:00+00',
  '2030-01-16 11:00:00+00',
  25000,
  'pending'
) ON CONFLICT (id) DO NOTHING;

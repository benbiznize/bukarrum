-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- ============================================================
-- STUDIOS
-- ============================================================
CREATE TABLE studios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookups on public pages
CREATE INDEX studios_slug_idx ON studios(slug);
-- Index for owner queries
CREATE INDEX studios_owner_idx ON studios(owner_id);

-- ============================================================
-- ROOMS
-- ============================================================
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  photos      TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  capacity    INTEGER CHECK (capacity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rooms_studio_idx ON rooms(studio_id);

-- ============================================================
-- AVAILABILITY
-- ============================================================
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
CREATE TABLE availability (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    TIME NOT NULL,
  close_time   TIME NOT NULL,
  CONSTRAINT open_before_close CHECK (open_time < close_time),
  UNIQUE (room_id, day_of_week)
);

CREATE INDEX availability_room_idx ON availability(room_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id            UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  studio_id          UUID NOT NULL REFERENCES studios(id) ON DELETE RESTRICT,
  client_name        TEXT NOT NULL,
  client_email       TEXT NOT NULL,
  client_phone       TEXT,
  start_time         TIMESTAMPTZ NOT NULL,
  end_time           TIMESTAMPTZ NOT NULL,
  total_price        NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status             booking_status NOT NULL DEFAULT 'pending',
  fintoc_payment_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX bookings_room_idx      ON bookings(room_id);
CREATE INDEX bookings_studio_idx    ON bookings(studio_id);
CREATE INDEX bookings_status_idx    ON bookings(status);
CREATE INDEX bookings_time_idx      ON bookings(start_time, end_time);

-- ============================================================
-- PREVENT DOUBLE-BOOKINGS
-- Exclude overlapping confirmed/pending bookings for the same room
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE studios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings    ENABLE ROW LEVEL SECURITY;

-- Studios: owners can CRUD their own studio
CREATE POLICY "studio_owner_select" ON studios
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "studio_owner_insert" ON studios
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "studio_owner_update" ON studios
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "studio_owner_delete" ON studios
  FOR DELETE USING (owner_id = auth.uid());

-- Public: anyone can read studio info (for booking page)
CREATE POLICY "studio_public_select" ON studios
  FOR SELECT USING (true);

-- Rooms: studio owner manages rooms
CREATE POLICY "rooms_owner_all" ON rooms
  FOR ALL USING (
    studio_id IN (SELECT id FROM studios WHERE owner_id = auth.uid())
  );

-- Public: anyone can read rooms
CREATE POLICY "rooms_public_select" ON rooms
  FOR SELECT USING (true);

-- Availability: studio owner manages
CREATE POLICY "availability_owner_all" ON availability
  FOR ALL USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN studios s ON s.id = r.studio_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Public: anyone can read availability
CREATE POLICY "availability_public_select" ON availability
  FOR SELECT USING (true);

-- Bookings: studio owner can read/update their studio's bookings
CREATE POLICY "bookings_owner_select" ON bookings
  FOR SELECT USING (
    studio_id IN (SELECT id FROM studios WHERE owner_id = auth.uid())
  );

CREATE POLICY "bookings_owner_update" ON bookings
  FOR UPDATE USING (
    studio_id IN (SELECT id FROM studios WHERE owner_id = auth.uid())
  );

-- Public: anyone can insert a booking (clients booking via public page)
CREATE POLICY "bookings_public_insert" ON bookings
  FOR INSERT WITH CHECK (true);

-- Service role (API routes) can update bookings (for webhook payment confirmation)
-- This is handled via service_role key in API routes, bypasses RLS

-- ============================================================
-- STORAGE BUCKET FOR LOGOS AND ROOM PHOTOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "studio_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'studio-assets');

CREATE POLICY "studio_assets_owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "studio_assets_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL
  );

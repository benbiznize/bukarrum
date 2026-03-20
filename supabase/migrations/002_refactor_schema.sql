-- ============================================================
-- Migration 002: Business / Location / Resource / Booking Groups
-- Replaces the flat studios/rooms model with a proper hierarchy
-- ============================================================

-- ============================================================
-- DROP OLD TABLES (in reverse dependency order)
-- ============================================================
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS studios CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE resource_type  AS ENUM ('room', 'equipment', 'service');

-- ============================================================
-- BUSINESSES
-- One per owner account — enforced via UNIQUE(owner_id)
-- ============================================================
CREATE TABLE businesses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX businesses_slug_idx  ON businesses(slug);
CREATE INDEX businesses_owner_idx ON businesses(owner_id);

-- ============================================================
-- LOCATIONS
-- Physical places within a business
-- ============================================================
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX locations_business_idx ON locations(business_id);

-- ============================================================
-- RESOURCES
-- Generalised bookable entities (rooms, equipment, services)
-- ============================================================
CREATE TABLE resources (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id        UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  type               resource_type NOT NULL DEFAULT 'room',
  name               TEXT NOT NULL,
  description        TEXT,
  photos             TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate        NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  capacity           INTEGER CHECK (capacity > 0),       -- nullable; meaningful for rooms only
  available_as_addon BOOLEAN NOT NULL DEFAULT false,     -- global cross-sell flag
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX resources_location_idx ON resources(location_id);

-- ============================================================
-- RESOURCE ADD-ONS
-- Defines which resources can be offered as add-ons to a specific resource
-- (upsell / cross-sell scaffolding — UI deferred)
-- ============================================================
CREATE TABLE resource_addons (
  resource_id       UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  addon_resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, addon_resource_id),
  CHECK (resource_id != addon_resource_id)
);

-- ============================================================
-- AVAILABILITY
-- Weekly schedule per resource
-- ============================================================
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL,
  CONSTRAINT open_before_close CHECK (open_time < close_time),
  UNIQUE (resource_id, day_of_week)
);

CREATE INDEX availability_resource_idx ON availability(resource_id);

-- ============================================================
-- BOOKING GROUPS
-- Order container — groups a primary booking + add-on bookings
-- (UI deferred; schema in place for future AOV features)
-- ============================================================
CREATE TABLE booking_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- One row per resource booked; add-ons share a booking_group_id
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_group_id  UUID REFERENCES booking_groups(id) ON DELETE SET NULL,
  resource_id       UUID NOT NULL REFERENCES resources(id)  ON DELETE RESTRICT,
  location_id       UUID NOT NULL REFERENCES locations(id)  ON DELETE RESTRICT,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  client_name       TEXT NOT NULL,
  client_email      TEXT NOT NULL,
  client_phone      TEXT,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  total_price       NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status            booking_status NOT NULL DEFAULT 'pending',
  fintoc_payment_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX bookings_resource_idx  ON bookings(resource_id);
CREATE INDEX bookings_location_idx  ON bookings(location_id);
CREATE INDEX bookings_business_idx  ON bookings(business_id);
CREATE INDEX bookings_status_idx    ON bookings(status);
CREATE INDEX bookings_time_idx      ON bookings(start_time, end_time);
CREATE INDEX bookings_group_idx     ON bookings(booking_group_id);

-- ============================================================
-- PREVENT DOUBLE-BOOKINGS (per resource)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE businesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;

-- Businesses
CREATE POLICY "businesses_owner_all" ON businesses
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "businesses_public_select" ON businesses
  FOR SELECT USING (true);

-- Locations
CREATE POLICY "locations_owner_all" ON locations
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "locations_public_select" ON locations
  FOR SELECT USING (true);

-- Resources
CREATE POLICY "resources_owner_all" ON resources
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "resources_public_select" ON resources
  FOR SELECT USING (true);

-- Resource add-ons
CREATE POLICY "resource_addons_owner_all" ON resource_addons
  FOR ALL USING (
    resource_id IN (
      SELECT r.id FROM resources r
      JOIN locations l ON l.id = r.location_id
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "resource_addons_public_select" ON resource_addons
  FOR SELECT USING (true);

-- Availability
CREATE POLICY "availability_owner_all" ON availability
  FOR ALL USING (
    resource_id IN (
      SELECT r.id FROM resources r
      JOIN locations l ON l.id = r.location_id
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "availability_public_select" ON availability
  FOR SELECT USING (true);

-- Booking groups — owner can read groups that contain their bookings
CREATE POLICY "booking_groups_owner_select" ON booking_groups
  FOR SELECT USING (
    id IN (
      SELECT booking_group_id FROM bookings
      WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
        AND booking_group_id IS NOT NULL
    )
  );

-- Bookings
CREATE POLICY "bookings_owner_select" ON bookings
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "bookings_owner_update" ON bookings
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "bookings_public_insert" ON bookings
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET (unchanged)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "studio_assets_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "studio_assets_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "studio_assets_owner_delete" ON storage.objects;

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

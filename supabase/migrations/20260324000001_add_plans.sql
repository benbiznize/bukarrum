-- ============================================================
-- Migration 003: Plans + tiered membership
-- ============================================================

CREATE TABLE plans (
  id                         TEXT PRIMARY KEY,
  name                       TEXT NOT NULL,
  max_locations              INTEGER,         -- NULL = unlimited
  max_resources_per_location INTEGER,         -- NULL = unlimited
  max_bookings_per_month     INTEGER,         -- NULL = unlimited
  features                   JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO plans (id, name, max_locations, max_resources_per_location, max_bookings_per_month, features) VALUES
  ('free',     'Gratuito', 1,    3,    30,  '{"analytics":false,"addons":false,"hide_branding":false}'),
  ('pro',      'Pro',      3,    15,   200, '{"analytics":"basic","addons":true,"hide_branding":true}'),
  ('business', 'Negocio',  NULL, NULL, NULL,'{"analytics":"advanced","addons":true,"hide_branding":true}');

ALTER TABLE businesses
  ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_select" ON plans FOR SELECT USING (true);

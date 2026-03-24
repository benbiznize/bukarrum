CREATE TABLE upgrade_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  current_plan TEXT        NOT NULL REFERENCES plans(id),
  target_plan  TEXT        NOT NULL REFERENCES plans(id),
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Owners can read their own business's requests
CREATE POLICY "upgrade_requests_owner_select" ON upgrade_requests
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

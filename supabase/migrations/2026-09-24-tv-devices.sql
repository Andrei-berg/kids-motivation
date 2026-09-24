-- TV board (Google TV Streamer): a TV pairs to a family with a 6-digit code that
-- a parent enters in Parent Center. The TV's long random secret is stored only as
-- a sha256 hash; the table is RLS deny-all (service-role routes only), read-only
-- access to family stats is all a paired TV ever gets.
CREATE TABLE IF NOT EXISTS tv_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID REFERENCES families(id) ON DELETE CASCADE,   -- null until claimed
  secret_hash   TEXT NOT NULL UNIQUE,
  pair_code     TEXT,                                             -- cleared once claimed
  code_expires  TIMESTAMPTZ,
  name          TEXT NOT NULL DEFAULT 'ТВ',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS tv_devices_pair_code_uidx ON tv_devices(pair_code) WHERE pair_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS tv_devices_family_idx ON tv_devices(family_id);
ALTER TABLE tv_devices ENABLE ROW LEVEL SECURITY;

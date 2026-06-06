CREATE TABLE IF NOT EXISTS agent_snapshots (
  id          BIGSERIAL    PRIMARY KEY,
  tick        INTEGER      NOT NULL,
  agent_id    SMALLINT     NOT NULL,
  speed       REAL,        -- state[0]: normalized speed (0–1)
  heading     REAL,        -- state[1]: normalized heading (0–1)
  dist_to_wp  REAL,        -- state[2]: normalized distance to next waypoint
  score       REAL,
  collided    BOOLEAN      NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_snapshots_agent_time
  ON agent_snapshots (agent_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS agent_snapshots_tick
  ON agent_snapshots (tick);

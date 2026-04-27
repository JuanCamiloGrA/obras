CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  markdown TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  play_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(play_id, name)
);

CREATE TABLE IF NOT EXISTS fragment_assignments (
  id TEXT PRIMARY KEY,
  play_id TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(play_id, start_offset, end_offset)
);

CREATE TABLE IF NOT EXISTS fragment_assignment_actors (
  assignment_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  PRIMARY KEY (assignment_id, actor_id)
);

CREATE TABLE IF NOT EXISTS play_votes (
  play_id TEXT NOT NULL,
  vote_block_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  option_id TEXT NOT NULL,
  option_label TEXT NOT NULL,
  client_updated_at INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (play_id, vote_block_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_plays_updated_at ON plays(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plays_active_public ON plays(is_active, published, hidden);
CREATE INDEX IF NOT EXISTS idx_actors_play_id ON actors(play_id);
CREATE INDEX IF NOT EXISTS idx_assignments_play_id ON fragment_assignments(play_id, start_offset);
CREATE INDEX IF NOT EXISTS idx_assignment_actors_assignment_id ON fragment_assignment_actors(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_actors_actor_id ON fragment_assignment_actors(actor_id);
CREATE INDEX IF NOT EXISTS idx_play_votes_play_block ON play_votes(play_id, vote_block_id);
CREATE INDEX IF NOT EXISTS idx_play_votes_actor_id ON play_votes(actor_id);

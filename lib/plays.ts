import { d1Execute, d1First, d1Query } from "@/lib/d1";
import { buildVoteReviews, parsePlayContent } from "@/lib/markdown-votes";
import type {
  AdminPlayDetail,
  AdminPlaySummary,
  AssignmentSummary,
  PublicPlayDetail,
  PublicPlaySummary,
  VoteBallotSummary,
} from "@/lib/types";
import { makeExcerpt } from "@/lib/utils";

type PlayRow = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  published: number;
  hidden: number;
  is_active: number;
  updated_at: string;
  actor_count?: number;
  assignment_count?: number;
  vote_count?: number;
};

type ActorRow = {
  id: string;
  name: string;
};

type AssignmentJoinRow = {
  assignment_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  actor_id: string | null;
  actor_name: string | null;
};

type PlayStatusRow = {
  id: string;
  slug: string;
  published: number;
  hidden: number;
};

type VoteRow = {
  vote_block_id: string;
  actor_id: string;
  actor_name: string;
  option_id: string;
  option_label: string;
  updated_at: string;
};

function toBool(value: number | string | null | undefined) {
  return Number(value || 0) === 1;
}

function toCount(value: number | string | null | undefined) {
  return Number(value || 0);
}

function mapAssignments(rows: AssignmentJoinRow[]): AssignmentSummary[] {
  const grouped = new Map<string, AssignmentSummary>();

  for (const row of rows) {
    const current = grouped.get(row.assignment_id);

    if (current) {
      if (row.actor_id && row.actor_name) {
        current.actorIds.push(row.actor_id);
        current.actorNames.push(row.actor_name);
      }
      continue;
    }

    grouped.set(row.assignment_id, {
      id: row.assignment_id,
      startOffset: Number(row.start_offset),
      endOffset: Number(row.end_offset),
      selectedText: row.selected_text,
      actorIds: row.actor_id ? [row.actor_id] : [],
      actorNames: row.actor_name ? [row.actor_name] : [],
    });
  }

  return [...grouped.values()];
}

async function getActorsByPlayId(playId: string) {
  const rows = await d1Query<ActorRow>(
    `SELECT id, name
     FROM actors
     WHERE play_id = ?
     ORDER BY name ASC`,
    [playId],
  );

  return rows.map((actor) => ({
    id: actor.id,
    name: actor.name,
  }));
}

async function getAssignmentsByPlayId(playId: string) {
  const rows = await d1Query<AssignmentJoinRow>(
    `SELECT
       fa.id AS assignment_id,
       fa.start_offset,
       fa.end_offset,
       fa.selected_text,
       a.id AS actor_id,
       a.name AS actor_name
     FROM fragment_assignments fa
     LEFT JOIN fragment_assignment_actors faa ON faa.assignment_id = fa.id
     LEFT JOIN actors a ON a.id = faa.actor_id
     WHERE fa.play_id = ?
     ORDER BY fa.start_offset ASC, a.name ASC`,
    [playId],
  );

  return mapAssignments(rows);
}

async function getVotesByPlayId(playId: string): Promise<VoteBallotSummary[]> {
  const rows = await d1Query<VoteRow>(
    `SELECT
       vote_block_id,
       actor_id,
       actor_name,
       option_id,
       option_label,
       updated_at
     FROM play_votes
     WHERE play_id = ?
     ORDER BY updated_at DESC, actor_name ASC`,
    [playId],
  );

  return rows.map((row) => ({
    voteId: row.vote_block_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    optionId: row.option_id,
    optionLabel: row.option_label,
    updatedAt: row.updated_at,
  }));
}

async function buildPlayDetail(play: PlayRow): Promise<AdminPlayDetail> {
  const { votes } = parsePlayContent(play.markdown);
  const [actors, assignments, voteBallots] = await Promise.all([
    getActorsByPlayId(play.id),
    getAssignmentsByPlayId(play.id),
    getVotesByPlayId(play.id),
  ]);

  return {
    id: play.id,
    title: play.title,
    slug: play.slug,
    markdown: play.markdown,
    published: toBool(play.published),
    hidden: toBool(play.hidden),
    isActive: toBool(play.is_active),
    actors,
    assignments,
    votes: buildVoteReviews(votes, voteBallots),
  };
}

function mapPublicPlay(play: AdminPlayDetail): PublicPlayDetail {
  return {
    id: play.id,
    title: play.title,
    slug: play.slug,
    markdown: play.markdown,
    actors: play.actors,
    assignments: play.assignments,
  };
}

async function touchPlay(playId: string) {
  await d1Execute(`UPDATE plays SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [playId]);
}

async function cleanupOrphanAssignments(playId: string) {
  await d1Execute(
    `DELETE FROM fragment_assignments
     WHERE play_id = ?
       AND id NOT IN (
         SELECT DISTINCT assignment_id
         FROM fragment_assignment_actors
       )`,
    [playId],
  );
}

export async function isSlugTaken(slug: string, excludeId?: string) {
  const row = excludeId
    ? await d1First<{ id: string }>(`SELECT id FROM plays WHERE slug = ? AND id <> ? LIMIT 1`, [slug, excludeId])
    : await d1First<{ id: string }>(`SELECT id FROM plays WHERE slug = ? LIMIT 1`, [slug]);

  return Boolean(row);
}

export async function getPlaySlugById(id: string) {
  const row = await d1First<{ slug: string }>(`SELECT slug FROM plays WHERE id = ? LIMIT 1`, [id]);
  return row?.slug ?? null;
}

export async function getPlayStatusById(id: string) {
  const row = await d1First<PlayStatusRow>(
    `SELECT id, slug, published, hidden FROM plays WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    published: toBool(row.published),
    hidden: toBool(row.hidden),
  };
}

export async function getAdminPlayList(): Promise<AdminPlaySummary[]> {
  const rows = await d1Query<PlayRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.markdown,
       p.published,
       p.hidden,
       p.is_active,
       p.updated_at,
       (SELECT COUNT(*) FROM actors a WHERE a.play_id = p.id) AS actor_count,
       (SELECT COUNT(*) FROM fragment_assignments fa WHERE fa.play_id = p.id) AS assignment_count,
       (SELECT COUNT(*) FROM play_votes pv WHERE pv.play_id = p.id) AS vote_count
      FROM plays p
      ORDER BY p.updated_at DESC`,
  );

  return rows.map((play) => {
    const voteBlockCount = parsePlayContent(play.markdown).votes.length;

    return {
      id: play.id,
      title: play.title,
      slug: play.slug,
      published: toBool(play.published),
      hidden: toBool(play.hidden),
      isActive: toBool(play.is_active),
      updatedAt: play.updated_at,
      actorCount: toCount(play.actor_count),
      assignmentCount: toCount(play.assignment_count),
      voteBlockCount,
      voteCount: toCount(play.vote_count),
    };
  });
}

export async function getAdminPlayById(id: string) {
  const play = await d1First<PlayRow>(
    `SELECT id, title, slug, markdown, published, hidden, is_active, updated_at
     FROM plays
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return play ? buildPlayDetail(play) : null;
}

export async function getActivePublicPlay() {
  const play = await d1First<PlayRow>(
    `SELECT id, title, slug, markdown, published, hidden, is_active, updated_at
     FROM plays
     WHERE is_active = 1 AND published = 1 AND hidden = 0
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  if (!play) {
    return null;
  }

  return mapPublicPlay(await buildPlayDetail(play));
}

export async function getPublishedPlayList(): Promise<PublicPlaySummary[]> {
  const rows = await d1Query<PlayRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.markdown,
       p.updated_at,
       (SELECT COUNT(*) FROM actors a WHERE a.play_id = p.id) AS actor_count
     FROM plays p
     WHERE p.published = 1 AND p.hidden = 0
     ORDER BY p.updated_at DESC`,
  );

  return rows.map((play) => ({
    id: play.id,
    title: play.title,
    slug: play.slug,
    excerpt: makeExcerpt(play.markdown),
    actorCount: toCount(play.actor_count),
  }));
}

export async function getPublicPlayBySlug(slug: string) {
  const play = await d1First<PlayRow>(
    `SELECT id, title, slug, markdown, published, hidden, is_active, updated_at
     FROM plays
     WHERE slug = ? AND published = 1 AND hidden = 0
     LIMIT 1`,
    [slug],
  );

  if (!play) {
    return null;
  }

  return mapPublicPlay(await buildPlayDetail(play));
}

export async function getPublicPlayById(id: string) {
  const play = await d1First<PlayRow>(
    `SELECT id, title, slug, markdown, published, hidden, is_active, updated_at
     FROM plays
     WHERE id = ? AND published = 1 AND hidden = 0
     LIMIT 1`,
    [id],
  );

  if (!play) {
    return null;
  }

  return mapPublicPlay(await buildPlayDetail(play));
}

export async function createPlay(title: string, slug: string) {
  const id = crypto.randomUUID();

  await d1Execute(
    `INSERT INTO plays (id, title, slug, markdown, published, hidden, is_active)
     VALUES (?, ?, ?, '', 0, 0, 0)`,
    [id, title, slug],
  );

  return { id };
}

export async function updatePlay(id: string, title: string, slug: string, markdown: string) {
  await d1Execute(
    `UPDATE plays
     SET title = ?, slug = ?, markdown = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND (title <> ? OR slug <> ? OR markdown <> ?)`,
    [title, slug, markdown, id, title, slug, markdown],
  );
}

export async function updatePlayPublished(id: string, published: boolean) {
  await d1Execute(
    `UPDATE plays
     SET published = ?, is_active = CASE WHEN ? = 1 THEN is_active ELSE 0 END, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [published ? 1 : 0, published ? 1 : 0, id],
  );
}

export async function updatePlayHidden(id: string, hidden: boolean) {
  await d1Execute(
    `UPDATE plays
     SET hidden = ?, is_active = CASE WHEN ? = 1 THEN 0 ELSE is_active END, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hidden ? 1 : 0, hidden ? 1 : 0, id],
  );
}

export async function setPlayActive(id: string, active: boolean) {
  if (active) {
    await d1Execute(`UPDATE plays SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1`);
  }

  await d1Execute(
    `UPDATE plays
     SET is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [active ? 1 : 0, id],
  );
}

export async function createActor(playId: string, name: string) {
  await d1Execute(
    `INSERT INTO actors (id, play_id, name)
     VALUES (?, ?, ?)`,
    [crypto.randomUUID(), playId, name],
  );

  await touchPlay(playId);
}

export async function deleteActor(playId: string, actorId: string) {
  await d1Execute(`DELETE FROM fragment_assignment_actors WHERE actor_id = ?`, [actorId]);
  await d1Execute(`DELETE FROM play_votes WHERE play_id = ? AND actor_id = ?`, [playId, actorId]);
  await d1Execute(`DELETE FROM actors WHERE id = ?`, [actorId]);
  await cleanupOrphanAssignments(playId);
  await touchPlay(playId);
}

export async function saveAssignment(
  playId: string,
  startOffset: number,
  endOffset: number,
  selectedText: string,
  actorIds: string[],
) {
  const existing = await d1First<{ id: string }>(
    `SELECT id
     FROM fragment_assignments
     WHERE play_id = ? AND start_offset = ? AND end_offset = ?
     LIMIT 1`,
    [playId, startOffset, endOffset],
  );

  const assignmentId = existing?.id ?? crypto.randomUUID();

  if (existing) {
    await d1Execute(
      `UPDATE fragment_assignments
       SET selected_text = ?
       WHERE id = ?`,
      [selectedText, assignmentId],
    );
  } else {
    await d1Execute(
      `INSERT INTO fragment_assignments (id, play_id, start_offset, end_offset, selected_text)
       VALUES (?, ?, ?, ?, ?)`,
      [assignmentId, playId, startOffset, endOffset, selectedText],
    );
  }

  await d1Execute(`DELETE FROM fragment_assignment_actors WHERE assignment_id = ?`, [assignmentId]);

  for (const actorId of actorIds) {
    await d1Execute(
      `INSERT INTO fragment_assignment_actors (assignment_id, actor_id)
       VALUES (?, ?)`,
      [assignmentId, actorId],
    );
  }

  await touchPlay(playId);
}

export async function deleteAssignment(playId: string, assignmentId: string) {
  await d1Execute(`DELETE FROM fragment_assignment_actors WHERE assignment_id = ?`, [assignmentId]);
  await d1Execute(`DELETE FROM fragment_assignments WHERE id = ?`, [assignmentId]);
  await touchPlay(playId);
}

export async function saveVote(
  playId: string,
  voteId: string,
  actorId: string,
  actorName: string,
  optionId: string,
  optionLabel: string,
  clientUpdatedAt: number,
) {
  await d1Execute(
    `INSERT INTO play_votes (
       play_id,
       vote_block_id,
       actor_id,
       actor_name,
       option_id,
       option_label,
       client_updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(play_id, vote_block_id, actor_id) DO UPDATE SET
       actor_name = excluded.actor_name,
       option_id = excluded.option_id,
       option_label = excluded.option_label,
       client_updated_at = excluded.client_updated_at,
       updated_at = CURRENT_TIMESTAMP
     WHERE excluded.client_updated_at >= play_votes.client_updated_at`,
    [playId, voteId, actorId, actorName, optionId, optionLabel, clientUpdatedAt],
  );
}

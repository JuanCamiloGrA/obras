import { NextResponse } from "next/server";

import { parsePlayContent } from "@/lib/markdown-votes";
import { getPublicPlayById, saveVote } from "@/lib/plays";

type VoteRequestBody = {
  playId?: string;
  voteId?: string;
  optionId?: string;
  actorId?: string;
  actorName?: string;
  optionLabel?: string;
  submittedAt?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VoteRequestBody | null;
  const playId = String(body?.playId || "").trim();
  const voteId = String(body?.voteId || "").trim();
  const optionId = String(body?.optionId || "").trim();
  const actorId = String(body?.actorId || "").trim();
  const submittedAt = Number(body?.submittedAt || 0);

  if (!playId || !voteId || !optionId || !actorId || !Number.isFinite(submittedAt) || submittedAt <= 0) {
    return NextResponse.json({ ok: false, error: "Faltan datos para registrar el voto." }, { status: 400 });
  }

  const play = await getPublicPlayById(playId);

  if (!play) {
    return NextResponse.json({ ok: false, error: "La obra no esta disponible para votar." }, { status: 404 });
  }

  const actor = play.actors.find((candidate) => candidate.id === actorId);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "El actor no pertenece a esta obra." }, { status: 400 });
  }

  const vote = parsePlayContent(play.markdown).votes.find((candidate) => candidate.id === voteId);

  if (!vote) {
    return NextResponse.json({ ok: false, error: "La votacion ya no existe en esta obra." }, { status: 404 });
  }

  const option = vote.options.find((candidate) => candidate.id === optionId);

  if (!option) {
    return NextResponse.json({ ok: false, error: "La opcion elegida ya no existe." }, { status: 400 });
  }

  await saveVote(play.id, vote.id, actor.id, actor.name, option.id, option.label, submittedAt);

  return NextResponse.json({
    ok: true,
    voteId: vote.id,
    actorId: actor.id,
    actorName: actor.name,
    optionId: option.id,
    optionLabel: option.label,
    savedAt: new Date().toISOString(),
  });
}

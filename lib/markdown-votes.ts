import type { VoteBallotSummary, VoteOption, VoteReview } from "@/lib/types";

export type VoteBlockDefinition = {
  id: string;
  title: string;
  index: number;
  startOffset: number;
  endOffset: number;
  options: VoteOption[];
};

type MarkdownSegment = {
  type: "markdown";
  id: string;
  markdown: string;
  startOffset: number;
  endOffset: number;
};

type VoteSegment = {
  type: "vote";
  vote: VoteBlockDefinition;
};

export type ParsedPlayContent = {
  segments: Array<MarkdownSegment | VoteSegment>;
  votes: VoteBlockDefinition[];
};

type LineInfo = {
  text: string;
  start: number;
  next: number;
};

function hashValue(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash >>> 0).toString(36);
}

function toLines(markdown: string) {
  const parts = markdown.split("\n");
  const lines: LineInfo[] = [];
  let start = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const text = parts[index] ?? "";
    const next = start + text.length + (index < parts.length - 1 ? 1 : 0);

    lines.push({
      text,
      start,
      next,
    });

    start = next;
  }

  return lines;
}

function buildVoteId(rawBlock: string, duplicateMap: Map<string, number>) {
  const baseId = hashValue(rawBlock.trim());
  const nextCount = (duplicateMap.get(baseId) ?? 0) + 1;

  duplicateMap.set(baseId, nextCount);

  return `vote-${baseId}-${nextCount}`;
}

function buildOptions(optionLabels: string[]) {
  const duplicateMap = new Map<string, number>();

  return optionLabels.map((label) => {
    const baseId = hashValue(label.trim());
    const nextCount = (duplicateMap.get(baseId) ?? 0) + 1;

    duplicateMap.set(baseId, nextCount);

    return {
      id: `option-${baseId}-${nextCount}`,
      label,
    };
  });
}

function pushMarkdownSegment(
  segments: Array<MarkdownSegment | VoteSegment>,
  markdown: string,
  startOffset: number,
  endOffset: number,
) {
  if (endOffset <= startOffset) {
    return;
  }

  segments.push({
    type: "markdown",
    id: `markdown-${startOffset}`,
    markdown: markdown.slice(startOffset, endOffset),
    startOffset,
    endOffset,
  });
}

export function parsePlayContent(markdown: string): ParsedPlayContent {
  const lines = toLines(markdown);
  const segments: Array<MarkdownSegment | VoteSegment> = [];
  const votes: VoteBlockDefinition[] = [];
  const duplicateVotes = new Map<string, number>();
  let cursor = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || line.text.trim() !== "[vote]") {
      continue;
    }

    let scanIndex = index + 1;
    const optionLabels: string[] = [];
    let currentOption: string[] = [];
    let separatorCount = 0;
    let blockEnd = line.next;

    while (scanIndex < lines.length) {
      const candidate = lines[scanIndex];

      if (!candidate) {
        break;
      }

      const trimmed = candidate.text.trim();

      if (!trimmed) {
        break;
      }

      blockEnd = candidate.next;

      if (trimmed === "---") {
        separatorCount += 1;

        if (currentOption.length) {
          optionLabels.push(currentOption.join("\n").trim());
          currentOption = [];
        }

        scanIndex += 1;
        continue;
      }

      currentOption.push(candidate.text);
      scanIndex += 1;
    }

    if (currentOption.length) {
      optionLabels.push(currentOption.join("\n").trim());
    }

    const cleanedOptions = optionLabels.filter(Boolean);

    if (separatorCount < 2 || cleanedOptions.length < 2) {
      continue;
    }

    pushMarkdownSegment(segments, markdown, cursor, line.start);

    const vote: VoteBlockDefinition = {
      id: buildVoteId(markdown.slice(line.start, blockEnd), duplicateVotes),
      title: `Votacion ${votes.length + 1}`,
      index: votes.length,
      startOffset: line.start,
      endOffset: blockEnd,
      options: buildOptions(cleanedOptions),
    };

    votes.push(vote);
    segments.push({
      type: "vote",
      vote,
    });

    cursor = blockEnd;
    index = scanIndex - 1;
  }

  pushMarkdownSegment(segments, markdown, cursor, markdown.length);

  return {
    segments,
    votes,
  };
}

export function buildVoteReviews(votes: VoteBlockDefinition[], ballots: VoteBallotSummary[]): VoteReview[] {
  const voteBallotsByVoteId = new Map<string, VoteBallotSummary[]>();

  for (const ballot of ballots) {
    const current = voteBallotsByVoteId.get(ballot.voteId);

    if (current) {
      current.push(ballot);
      continue;
    }

    voteBallotsByVoteId.set(ballot.voteId, [ballot]);
  }

  return votes.map((vote) => {
    const voteBallots = voteBallotsByVoteId.get(vote.id) ?? [];

    return {
      id: vote.id,
      title: vote.title,
      totalVotes: voteBallots.length,
      options: vote.options.map((option) => {
        const actorNames = voteBallots
          .filter((ballot) => ballot.optionId === option.id)
          .map((ballot) => ballot.actorName);

        return {
          ...option,
          voteCount: actorNames.length,
          actorNames,
        };
      }),
      ballots: [...voteBallots].sort((left, right) => left.actorName.localeCompare(right.actorName, "es")),
    };
  });
}

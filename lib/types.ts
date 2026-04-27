export type ActorSummary = {
  id: string;
  name: string;
};

export type AssignmentSummary = {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  actorIds: string[];
  actorNames: string[];
};

export type VoteOption = {
  id: string;
  label: string;
};

export type VoteBallotSummary = {
  voteId: string;
  actorId: string;
  actorName: string;
  optionId: string;
  optionLabel: string;
  updatedAt: string;
};

export type VoteOptionReview = VoteOption & {
  voteCount: number;
  actorNames: string[];
};

export type VoteReview = {
  id: string;
  title: string;
  totalVotes: number;
  options: VoteOptionReview[];
  ballots: VoteBallotSummary[];
};

export type AdminPlaySummary = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  hidden: boolean;
  isActive: boolean;
  updatedAt: string;
  actorCount: number;
  assignmentCount: number;
  voteBlockCount: number;
  voteCount: number;
};

export type AdminPlayDetail = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  published: boolean;
  hidden: boolean;
  isActive: boolean;
  actors: ActorSummary[];
  assignments: AssignmentSummary[];
  votes: VoteReview[];
};

export type PublicPlaySummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  actorCount: number;
};

export type PublicPlayDetail = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  actors: ActorSummary[];
  assignments: AssignmentSummary[];
};

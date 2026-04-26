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

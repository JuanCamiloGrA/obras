type HighlightRange = {
  startOffset: number;
  endOffset: number;
};

type GenericNode = Record<string, unknown> & {
  type?: string;
  value?: string;
  children?: GenericNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

function isNode(value: unknown): value is GenericNode {
  return typeof value === "object" && value !== null;
}

function normalizeRanges(ranges: HighlightRange[]) {
  const sortedRanges = ranges
    .filter((range) => Number.isFinite(range.startOffset) && Number.isFinite(range.endOffset))
    .map((range) => ({
      startOffset: Math.max(0, Math.min(range.startOffset, range.endOffset)),
      endOffset: Math.max(0, Math.max(range.startOffset, range.endOffset)),
    }))
    .filter((range) => range.endOffset > range.startOffset)
    .sort((left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset);

  const mergedRanges: HighlightRange[] = [];

  for (const range of sortedRanges) {
    const previous = mergedRanges.at(-1);

    if (previous && range.startOffset <= previous.endOffset) {
      previous.endOffset = Math.max(previous.endOffset, range.endOffset);
      continue;
    }

    mergedRanges.push({ ...range });
  }

  return mergedRanges;
}

function splitTextNode(node: GenericNode, ranges: HighlightRange[]) {
  const value = typeof node.value === "string" ? node.value : "";
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;

  if (typeof start !== "number" || typeof end !== "number") {
    return [node];
  }

  const overlaps = ranges.filter((range) => range.endOffset > start && range.startOffset < end);

  if (!overlaps.length) {
    return [node];
  }

  const nextChildren: GenericNode[] = [];
  let cursor = start;

  for (const range of overlaps) {
    const segmentStart = Math.max(range.startOffset, start);
    const segmentEnd = Math.min(range.endOffset, end);

    if (segmentStart > cursor) {
      nextChildren.push({
        type: "text",
        value: value.slice(cursor - start, segmentStart - start),
      });
    }

    if (segmentEnd > segmentStart) {
      nextChildren.push({
        type: "strong",
        data: {
          hName: "mark",
          hProperties: {
            className: ["actor-highlight"],
          },
        },
        children: [
          {
            type: "text",
            value: value.slice(segmentStart - start, segmentEnd - start),
          },
        ],
      });
    }

    cursor = Math.max(cursor, segmentEnd);
  }

  if (cursor < end) {
    nextChildren.push({
      type: "text",
      value: value.slice(cursor - start),
    });
  }

  return nextChildren;
}

function transformNode(node: unknown, ranges: HighlightRange[]): GenericNode[] {
  if (!isNode(node)) {
    return [];
  }

  if (node.type === "text") {
    return splitTextNode(node, ranges);
  }

  if (Array.isArray(node.children)) {
    return [
      {
        ...node,
        children: node.children.flatMap((child) => transformNode(child, ranges)),
      },
    ];
  }

  return [node];
}

export function remarkHighlightActor(ranges: HighlightRange[]) {
  const normalizedRanges = normalizeRanges(ranges);

  return function attachHighlightActor() {
    return function transformer(tree: unknown) {
      if (!normalizedRanges.length || !isNode(tree) || !Array.isArray(tree.children)) {
        return;
      }

      tree.children = tree.children.flatMap((child) => transformNode(child, normalizedRanges));
    };
  };
}

import { visit } from "unist-util-visit";

type HighlightRange = {
  startOffset: number;
  endOffset: number;
};

type TextNode = {
  type: "text";
  value: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type ParentNode = {
  children: Array<Record<string, unknown>>;
};

export function remarkHighlightActor(ranges: HighlightRange[]) {
  const sortedRanges = [...ranges].sort((a, b) => a.startOffset - b.startOffset);

  return function transformer(tree: Record<string, unknown>) {
    visit(tree as never, "text", (node, index, parent) => {
      if (index === undefined || !parent) {
        return;
      }

      const textNode = node as TextNode;
      const parentNode = parent as ParentNode;
      const start = textNode.position?.start?.offset;
      const end = textNode.position?.end?.offset;

      if (typeof start !== "number" || typeof end !== "number") {
        return;
      }

      const overlaps = sortedRanges.filter(
        (range) => range.endOffset > start && range.startOffset < end,
      );

      if (!overlaps.length) {
        return;
      }

      const nextChildren: Array<Record<string, unknown>> = [];
      let cursor = start;

      for (const range of overlaps) {
        const segmentStart = Math.max(range.startOffset, start);
        const segmentEnd = Math.min(range.endOffset, end);

        if (segmentStart > cursor) {
          nextChildren.push({
            type: "text",
            value: textNode.value.slice(cursor - start, segmentStart - start),
          });
        }

        if (segmentEnd > segmentStart) {
          nextChildren.push({
            type: "strong",
            data: {
              hName: "span",
              hProperties: {
                className: ["actor-highlight"],
              },
            },
            children: [
              {
                type: "text",
                value: textNode.value.slice(segmentStart - start, segmentEnd - start),
              },
            ],
          });
        }

        cursor = Math.max(cursor, segmentEnd);
      }

      if (cursor < end) {
        nextChildren.push({
          type: "text",
          value: textNode.value.slice(cursor - start),
        });
      }

      parentNode.children.splice(index, 1, ...nextChildren);
      return index + nextChildren.length;
    });
  };
}

"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { remarkHighlightActor } from "@/lib/markdown-highlights";
import type { AssignmentSummary } from "@/lib/types";

type MarkdownArticleProps = {
  markdown: string;
  assignments: AssignmentSummary[];
  activeActorId?: string;
};

export function MarkdownArticle({
  markdown,
  assignments,
  activeActorId = "",
}: MarkdownArticleProps) {
  const ranges = activeActorId
    ? assignments
        .filter((assignment) => assignment.actorIds.includes(activeActorId))
        .map((assignment) => ({
          startOffset: assignment.startOffset,
          endOffset: assignment.endOffset,
        }))
    : [];

  return (
    <article className="markdownArticle">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm, remarkHighlightActor(ranges)]}
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          img: ({ alt, src }) => {
            if (!src) {
              return null;
            }

            // Uploaded images are plain local files from admin content.
            // eslint-disable-next-line @next/next/no-img-element
            return <img className="articleImage" src={src} alt={alt || "Imagen de la obra"} />;
          },
          audio: ({ ...props }) => <audio className="articleAudio" controls {...props} />,
        }}
      >
        {markdown || "_Esta obra todavía no tiene contenido._"}
      </ReactMarkdown>
    </article>
  );
}

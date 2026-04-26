export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<audio[^>]*><\/audio>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeExcerpt(markdown: string, size = 180) {
  const clean = stripMarkdown(markdown);

  if (clean.length <= size) {
    return clean;
  }

  return `${clean.slice(0, size).trim()}...`;
}

export function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function insertAtSelection(
  source: string,
  start: number,
  end: number,
  snippet: string,
) {
  return `${source.slice(0, start)}${snippet}${source.slice(end)}`;
}

// Docs: [[example-markdown/notes/Architecture.md]]
export const linked = true;

export function parseCommentedLink(source: string): string | null {
  const match = source.match(/\[\[(.*?)\]\]/);
  return match?.[1] ?? null;
}

import { readStringArray } from './stringArray';

export function normalizePersistedCssSnippets(normalized: Record<string, unknown>): void {
  if (!('cssSnippets' in normalized)) {
    return;
  }

  const snippets = Array.from(new Set(
    readStringArray(normalized.cssSnippets)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0),
  ));

  normalized.cssSnippets = snippets;
}

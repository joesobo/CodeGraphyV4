function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizePersistedCssSnippets(normalized: Record<string, unknown>): void {
  if (!('cssSnippets' in normalized)) {
    return;
  }

  const value = normalized.cssSnippets;
  if (!isRecord(value)) {
    delete normalized.cssSnippets;
    return;
  }

  const snippets: Record<string, boolean> = {};
  for (const [path, enabled] of Object.entries(value)) {
    const snippetPath = path.trim();
    if (snippetPath.length === 0 || typeof enabled !== 'boolean') {
      continue;
    }
    snippets[snippetPath] = enabled;
  }

  normalized.cssSnippets = snippets;
}

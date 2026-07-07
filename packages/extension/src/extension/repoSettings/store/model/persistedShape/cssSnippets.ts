import { unknownRecordSchema } from '../../../../../shared/values';

export function normalizePersistedCssSnippets(normalized: Record<string, unknown>): void {
  if (!('cssSnippets' in normalized)) {
    return;
  }

  const parsed = unknownRecordSchema.safeParse(normalized.cssSnippets);
  if (!parsed.success) {
    delete normalized.cssSnippets;
    return;
  }

  const snippets: Record<string, boolean> = {};
  for (const [path, enabled] of Object.entries(parsed.data)) {
    const snippetPath = path.trim();
    if (snippetPath.length === 0 || typeof enabled !== 'boolean') {
      continue;
    }
    snippets[snippetPath] = enabled;
  }

  normalized.cssSnippets = snippets;
}

import { replaceCssSnippetStylesheets } from '../../../cssSnippets/links';
import { graphStore } from '../../../store/state';

function readSnippets(payload: unknown): Record<string, boolean> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const snippets = (payload as { snippets?: unknown }).snippets;
  if (!snippets || typeof snippets !== 'object' || Array.isArray(snippets)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(snippets)
      .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
}

function readStylesheets(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const stylesheets = (payload as { stylesheets?: unknown }).stylesheets;
  return Array.isArray(stylesheets)
    ? stylesheets.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export function handleCssSnippetsUpdatedMessage(raw: { type?: unknown; payload?: unknown }): boolean {
  if (raw.type !== 'CSS_SNIPPETS_UPDATED') {
    return false;
  }

  graphStore.getState().setCssSnippets(readSnippets(raw.payload));
  replaceCssSnippetStylesheets(readStylesheets(raw.payload));
  return true;
}

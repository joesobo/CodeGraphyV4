import { replaceCssSnippetStylesheets } from '../../../cssSnippets/links';

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

  replaceCssSnippetStylesheets(readStylesheets(raw.payload));
  return true;
}

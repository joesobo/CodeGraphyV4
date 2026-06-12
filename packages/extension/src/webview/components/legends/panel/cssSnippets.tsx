import React from 'react';
import { graphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';
import { Switch } from '../../ui/switch';

interface CssSnippetsSectionProps {
  snippets: Record<string, boolean>;
}

function setCssSnippetEnabled(path: string, enabled: boolean): void {
  graphStore.setState((state) => ({
    cssSnippets: {
      ...state.cssSnippets,
      [path]: enabled,
    },
  }));
}

function postCssSnippetToggle(path: string, enabled: boolean): void {
  postMessage({
    type: 'UPDATE_CSS_SNIPPET',
    payload: { path, enabled },
  });
}

export function CssSnippetsSection({
  snippets,
}: CssSnippetsSectionProps): React.ReactElement | null {
  const entries = Object.entries(snippets);
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2" data-codegraphy-section="css-snippets">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-text-muted)]">
        CSS Snippets
      </h3>
      <div
        className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]"
        data-codegraphy-list="css-snippets"
      >
        {entries.map(([path, enabled]) => (
          <div
            key={path}
            className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--cg-accent-subtle)]"
            data-codegraphy-row="css-snippet"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium" title={path}>
              {path}
            </span>
            <Switch
              aria-label={`Toggle ${path}`}
              checked={enabled}
              onCheckedChange={(nextEnabled) => {
                setCssSnippetEnabled(path, nextEnabled);
                postCssSnippetToggle(path, nextEnabled);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

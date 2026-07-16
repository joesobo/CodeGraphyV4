import React from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { graphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';
import { MdiIcon } from '../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/disclosure/collapsible';
import { Switch } from '../../ui/switch';
import { useCollapsibleEntryState } from './section/collapseState';
import { CssSnippetDraft } from './cssSnippetDraft';

interface CssSnippetsSectionProps {
  collapsedEntries: Record<string, boolean>;
  onCollapsedChange: (entryId: string, collapsed: boolean) => void;
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

function addCssSnippet(path: string): void {
  setCssSnippetEnabled(path, true);
  postCssSnippetToggle(path, true);
}

export function CssSnippetsSection({
  collapsedEntries,
  onCollapsedChange,
  snippets,
}: CssSnippetsSectionProps): React.ReactElement | null {
  const { collapsed, onOpenChange } = useCollapsibleEntryState({
    collapsedEntries,
    onCollapsedChange,
    storageKey: 'section:css-snippets',
  });
  const open = !collapsed;
  const entries = Object.entries(snippets);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section className="space-y-2" data-codegraphy-section="css-snippets">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-[var(--cg-accent-faint)]"
            title="Toggle CSS Snippets section"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-text-muted)]">
              CSS Snippets
            </h3>
            <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={16} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2">
            <CssSnippetDraft onAdd={addCssSnippet} />
            <div
              className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]"
              data-codegraphy-list="css-snippets"
            >
              {entries.length === 0 ? (
                <div
                  className="px-3 py-2 text-xs text-[var(--cg-text-muted)]"
                  data-codegraphy-row="css-snippet-empty"
                >
                  No CSS snippets configured
                </div>
              ) : entries.map(([path, enabled]) => (
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
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

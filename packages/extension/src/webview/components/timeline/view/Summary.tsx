import React from 'react';
import type { ICommitInfo } from '../../../../shared/timeline/types';
import { formatDate } from '../format/dates';
import { getMessageBody, getMessageTitle } from '../format/messages';

export interface TimelineSummaryProps {
  currentCommit: ICommitInfo;
  currentIndex: number;
  totalCommits: number;
}

function getCommitKindLabel(commit: ICommitInfo): string | null {
  if (commit.parents.length === 0) {
    return 'Root commit';
  }

  if (commit.parents.length > 1) {
    return 'Merge commit';
  }

  return null;
}

export default function Summary({
  currentCommit,
  currentIndex,
  totalCommits,
}: TimelineSummaryProps): React.ReactElement {
  const title = getMessageTitle(currentCommit.message);
  const body = getMessageBody(currentCommit.message);
  const commitKindLabel = getCommitKindLabel(currentCommit);

  return (
    <section className="border-t border-border px-3 py-2" data-testid="timeline-summary">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--vscode-descriptionForeground,#999)]">
          Current Commit
        </span>
        <span className="text-[11px] text-[var(--vscode-descriptionForeground,#999)]">
          {currentIndex + 1} of {totalCommits}
        </span>
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-[var(--vscode-descriptionForeground,#999)]">
          {currentCommit.sha.slice(0, 7)}
        </span>
        <span className="text-xs text-[var(--vscode-descriptionForeground,#999)]">
          {currentCommit.author}
        </span>
        <span className="text-xs text-[var(--vscode-descriptionForeground,#999)]">
          {formatDate(currentCommit.timestamp)}
        </span>
        {commitKindLabel && (
          <span className="rounded bg-[var(--vscode-editor-inactiveSelectionBackground,#2a2d2e)] px-1.5 py-0.5 text-[11px] text-[var(--vscode-foreground,#ccc)]">
            {commitKindLabel}
          </span>
        )}
      </div>

      <div className="text-sm font-medium text-[var(--vscode-foreground,#ccc)]">
        {title}
      </div>

      {body && (
        <p
          className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground,#999)]"
          data-testid="timeline-summary-body"
        >
          {body}
        </p>
      )}
    </section>
  );
}

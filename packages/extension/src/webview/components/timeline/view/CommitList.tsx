import React from 'react';
import type { ICommitInfo } from '../../../../shared/timeline/contracts';
import { ChevronIcon } from '../../settingsPanel/SectionHeader';
import { formatDate } from '../format/dates';
import { getMessageTitle, truncateMessage } from '../format/messages';

export interface TimelineCommitListProps {
  collapsed: boolean;
  currentCommitSha: string | null;
  onSelectCommit: (sha: string) => void;
  onToggle: () => void;
  timelineCommits: ICommitInfo[];
}

export default function CommitList({
  collapsed,
  currentCommitSha,
  onSelectCommit,
  onToggle,
  timelineCommits,
}: TimelineCommitListProps): React.ReactElement {
  const commits = [...timelineCommits].reverse();

  return (
    <section
      className={`border-t border-border ${collapsed ? 'flex-shrink-0' : 'min-h-0 flex flex-1 flex-col overflow-hidden'}`}
      data-testid="timeline-commit-list"
    >
      <div className="px-3 py-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label="Commits"
          className="inline-flex items-center gap-1 rounded-sm py-1 text-left transition-colors hover:text-[var(--vscode-foreground,#ccc)]"
          onClick={onToggle}
        >
          <ChevronIcon open={!collapsed} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--vscode-descriptionForeground,#999)]">
            Commits
          </span>
        </button>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid="timeline-commit-list-scroll">
          {commits.map((commit) => {
            const isCurrent = commit.sha === currentCommitSha;
            return (
              <button
                key={commit.sha}
                type="button"
                className={`block w-full border-b border-border px-3 py-2 text-left transition-colors last:border-b-0 ${
                  isCurrent
                    ? 'bg-[var(--vscode-list-activeSelectionBackground,#264f78)] text-[var(--vscode-list-activeSelectionForeground,#fff)]'
                    : 'hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]'
                }`}
                data-testid="timeline-commit-item"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelectCommit(commit.sha)}
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-medium">
                  <span>{truncateMessage(getMessageTitle(commit.message), 48)}</span>
                  {commit.parents.length > 1 && (
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-[var(--vscode-descriptionForeground,#999)]">
                      Merge
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--vscode-descriptionForeground,#999)]">
                  <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                  <span>{commit.author}</span>
                  <span>{formatDate(commit.timestamp)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

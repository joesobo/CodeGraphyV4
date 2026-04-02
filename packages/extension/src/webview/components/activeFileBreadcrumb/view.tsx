import React from 'react';
import { postMessage } from '../../vscodeApi';

interface ActiveFileBreadcrumbProps {
  filePath: string | null;
}

function splitSegments(filePath: string): string[] {
  return filePath.split('/').filter(Boolean);
}

export function ActiveFileBreadcrumb({
  filePath,
}: ActiveFileBreadcrumbProps): React.ReactElement | null {
  if (!filePath) {
    return null;
  }

  const segments = splitSegments(filePath);

  return (
    <button
      type="button"
      aria-label={`Open ${filePath}`}
      className="flex max-w-full items-center gap-1 overflow-hidden rounded-md px-1 py-1 text-left text-xs text-[var(--vscode-descriptionForeground,#9ca3af)] transition-colors hover:text-[var(--vscode-foreground,#d4d4d4)]"
      onClick={() => {
        postMessage({ type: 'OPEN_FILE', payload: { path: filePath } });
      }}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <React.Fragment key={`${segment}-${index}`}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="shrink-0 text-[var(--vscode-disabledForeground,#6b7280)]"
              >
                ›
              </span>
            ) : null}
            <span
              className={[
                'truncate',
                isLast
                  ? 'font-medium text-[var(--vscode-foreground,#d4d4d4)]'
                  : 'text-[var(--vscode-descriptionForeground,#9ca3af)]',
              ].join(' ')}
            >
              {segment}
            </span>
          </React.Fragment>
        );
      })}
    </button>
  );
}

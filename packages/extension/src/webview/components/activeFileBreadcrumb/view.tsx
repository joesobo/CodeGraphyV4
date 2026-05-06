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
      className="flex max-w-full items-center gap-1 overflow-hidden rounded-md px-1 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
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
                className="shrink-0 text-[var(--cg-disabled-foreground)]"
              >
                ›
              </span>
            ) : null}
            <span
              className={[
                'truncate',
                isLast
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
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

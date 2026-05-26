import React from 'react';

interface PatternListProps {
  children?: React.ReactNode;
  empty: boolean;
}

export function PatternList({
  children,
  empty,
}: PatternListProps): React.ReactElement {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      {empty ? (
        <p className="text-xs text-muted-foreground">No filters.</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  );
}

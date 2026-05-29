import React from 'react';

export interface LegendCollapseProps {
  collapsedEntries?: Record<string, boolean>;
  onCollapsedChange?: (entryId: string, collapsed: boolean) => void;
  storageKey: string;
}

export function useCollapsibleEntryState({
  collapsedEntries,
  onCollapsedChange,
  storageKey,
}: LegendCollapseProps): {
  collapsed: boolean;
  onOpenChange: (nextOpen: boolean) => void;
} {
  const resolvedCollapsedEntries = collapsedEntries ?? {};
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(
    resolvedCollapsedEntries[storageKey] ?? false,
  );
  const collapsed = onCollapsedChange
    ? (resolvedCollapsedEntries[storageKey] ?? false)
    : uncontrolledCollapsed;

  return {
    collapsed,
    onOpenChange: (nextOpen: boolean) => {
      if (onCollapsedChange) {
        onCollapsedChange(storageKey, !nextOpen);
        return;
      }

      setUncontrolledCollapsed(!nextOpen);
    },
  };
}

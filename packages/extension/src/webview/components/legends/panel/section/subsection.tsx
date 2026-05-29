import React from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { MdiIcon } from '../../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../ui/disclosure/collapsible';
import { Switch } from '../../../ui/switch';
import {
  type LegendCollapseProps,
  useCollapsibleEntryState,
} from './collapseState';

export function getLegendSubsectionCollapseTitle(open: boolean, label: string): string {
  return `${open ? 'Collapse' : 'Expand'} ${label} legend entries`;
}

export function stopSubsectionTogglePropagation(event: Pick<React.MouseEvent, 'stopPropagation'>): void {
  event.stopPropagation();
}

export function LegendSubsection({
  children,
  collapsedEntries,
  group,
  onCollapsedChange,
  onToggle,
  storageKey,
  toggleChecked,
  toggleTitle,
}: LegendCollapseProps & {
  children: React.ReactNode;
  group: { label: string };
  toggleChecked?: boolean;
  toggleTitle?: string;
  onToggle?: () => void;
}): React.ReactElement {
  const { collapsed, onOpenChange } = useCollapsibleEntryState({
    collapsedEntries,
    onCollapsedChange,
    storageKey,
  });
  const open = !collapsed;
  const collapseTitle = getLegendSubsectionCollapseTitle(open, group.label);

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
    >
      <div
        data-testid="legend-rule-subsection"
        className="border-t border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] first:border-t-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
              title={collapseTitle}
            >
              <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={14} />
              <span className="truncate">{group.label}</span>
            </button>
          </CollapsibleTrigger>
          {onToggle ? (
            <Switch
              checked={toggleChecked}
              title={toggleTitle}
              aria-label={toggleTitle}
              onClick={stopSubsectionTogglePropagation}
              onCheckedChange={onToggle}
            />
          ) : null}
        </div>
        <CollapsibleContent>
          <div className="divide-y divide-[var(--cg-divider-subtle)] bg-[var(--cg-surface-subtle)]">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

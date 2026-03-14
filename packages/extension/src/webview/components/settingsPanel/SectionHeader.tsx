import React from 'react';
import { mdiChevronRight } from '@mdi/js';
import { cn } from '../../lib/utils';
import { MdiIcon } from '../icons';

export function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <span
      data-testid="settings-panel-chevron"
      className={cn('text-muted-foreground transition-transform', open && 'rotate-90')}
    >
      <MdiIcon path={mdiChevronRight} size={14} />
    </span>
  );
}

export function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-accent rounded transition-colors"
    >
      <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      <ChevronIcon open={open} />
    </button>
  );
}

import React from 'react';
import { Switch } from '../../../ui/switch';

interface SectionHeaderProps {
  ariaLabel: string;
  checked: boolean;
  count: number;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  subtext: string;
  includeAllInAriaLabel?: boolean;
}

export function SectionHeader({
  ariaLabel,
  checked,
  count,
  label,
  onCheckedChange,
  subtext,
  includeAllInAriaLabel = true,
}: SectionHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-medium">
          {label} <span className="text-muted-foreground">{count}</span>
        </h3>
        <p className="text-[11px] text-muted-foreground">{subtext}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`${checked ? 'Disable' : 'Enable'} ${includeAllInAriaLabel ? 'all ' : ''}${ariaLabel}`}
      />
    </div>
  );
}

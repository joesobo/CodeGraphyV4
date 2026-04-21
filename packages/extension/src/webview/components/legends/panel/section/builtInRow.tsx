import React from 'react';
import { Switch } from '../../../ui/switch';
import { LegendColorInput } from './colorInput';
import type { LegendBuiltInEntry } from './contracts';

export function LegendBuiltInRow({
  entry,
  onChange,
  onToggleColor,
  showColorToggle = false,
}: {
  entry: LegendBuiltInEntry;
  onChange: (id: string, color: string) => void;
  onToggleColor?: (id: string, enabled: boolean) => void;
  showColorToggle?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium" title={entry.label}>
          {entry.label}
        </div>
      </div>
      <LegendColorInput
        ariaLabel={`${entry.label} color`}
        color={entry.colorEnabled === false ? entry.defaultColor : entry.color}
        disabled={entry.colorEnabled === false}
        onCommit={(color) => onChange(entry.id, color)}
      />
      {showColorToggle && onToggleColor ? (
        <Switch
          checked={entry.colorEnabled ?? true}
          aria-label={`Toggle ${entry.label} legend color`}
          title={`Toggle ${entry.label} legend color`}
          onCheckedChange={(enabled) => onToggleColor(entry.id, enabled)}
        />
      ) : null}
    </div>
  );
}

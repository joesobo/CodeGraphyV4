import React from 'react';
import { LegendColorInput } from './colorInput';
import type { LegendBuiltInEntry } from './contracts';

export function LegendBuiltInRow({
  entry,
  onChange,
}: {
  entry: LegendBuiltInEntry;
  onChange: (id: string, color: string) => void;
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
        color={entry.color}
        onCommit={(color) => onChange(entry.id, color)}
      />
    </div>
  );
}

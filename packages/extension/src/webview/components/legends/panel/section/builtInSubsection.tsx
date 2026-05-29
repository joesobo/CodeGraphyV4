import React from 'react';
import type { LegendBuiltInEntry, LegendTargetSection } from './contracts';
import type { LegendCollapseProps } from './collapseState';
import { LegendBuiltInRow } from './builtInRow';
import { LegendSubsection } from './subsection';

export function BuiltInRulesSubsection({
  builtInEntries,
  collapsedEntries,
  onBuiltInColorChange,
  onCollapsedChange,
  target,
}: LegendCollapseProps & {
  builtInEntries: LegendBuiltInEntry[];
  onBuiltInColorChange: (id: string, color: string) => void;
  target: LegendTargetSection;
}): React.ReactElement | null {
  if (!builtInEntries.length) {
    return null;
  }

  return (
    <LegendSubsection
      collapsedEntries={collapsedEntries}
      group={{ label: 'Defaults' }}
      onCollapsedChange={onCollapsedChange}
      storageKey={`${target}:defaults`}
    >
      {builtInEntries.map((entry) => (
        <LegendBuiltInRow
          key={entry.id}
          entry={entry}
          onChange={onBuiltInColorChange}
        />
      ))}
    </LegendSubsection>
  );
}

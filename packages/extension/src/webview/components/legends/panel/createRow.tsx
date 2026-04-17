import React, { useState } from 'react';
import { mdiPlus } from '@mdi/js';
import type { IGroup } from '../../../../shared/settings/groups';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { LegendColorInput } from './colorInput';
import { createLegendRuleId } from './messages';
import type { LegendTargetSection } from './contracts';

export function LegendRuleCreateRow({
  target,
  onAdd,
}: {
  target: LegendTargetSection;
  onAdd: (rule: IGroup) => void;
}): React.ReactElement {
  const [pattern, setPattern] = useState('');
  const [color, setColor] = useState('#3B82F6');

  return (
    <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
      <div className="min-w-0 flex-1">
        <Input
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder="Pattern, e.g. */tests/**"
          className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          aria-label={`New ${target} legend pattern`}
        />
      </div>
      <LegendColorInput
        ariaLabel={`New ${target} legend color`}
        color={color}
        onCommit={setColor}
        immediate={true}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0 border-border/60 bg-background/20 p-0 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
        onClick={() => {
          const nextPattern = pattern.trim();
          if (!nextPattern) {
            return;
          }

          onAdd({
            id: createLegendRuleId(),
            pattern: nextPattern,
            color,
            target,
          });
          setPattern('');
          setColor('#3B82F6');
        }}
        title={`Add ${target} legend`}
      >
        <MdiIcon path={mdiPlus} size={14} />
      </Button>
    </div>
  );
}

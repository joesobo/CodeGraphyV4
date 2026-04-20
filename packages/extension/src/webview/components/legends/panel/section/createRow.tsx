import React, { useState } from 'react';
import { mdiPlus } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { LegendColorInput } from './colorInput';
import { createLegendRuleId } from '../messages';
import type { LegendTargetSection } from './contracts';
import { LegendRuleVisual } from './visual';

export function LegendRuleCreateRow({
  target,
  onAdd,
}: {
  target: LegendTargetSection;
  onAdd: (rule: IGroup, iconImports?: LegendIconImport[]) => void;
}): React.ReactElement {
  const [draftRuleId, setDraftRuleId] = useState(() => createLegendRuleId());
  const [pattern, setPattern] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [visualRule, setVisualRule] = useState<Partial<IGroup>>({});
  const [iconImports, setIconImports] = useState<LegendIconImport[]>([]);

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
      <LegendRuleVisual
        editable={target === 'node'}
        index={-1}
        rule={{
          id: draftRuleId,
          pattern: pattern || `New ${target} legend`,
          color,
          target,
          ...visualRule,
        }}
        title={`Edit new ${target} legend visual`}
        onChange={(nextRule, nextIconImports) => {
          setVisualRule({
            imagePath: nextRule.imagePath,
            imageUrl: nextRule.imageUrl,
            shape2D: nextRule.shape2D,
            shape3D: nextRule.shape3D,
          });
          if (nextIconImports?.length) {
            setIconImports(nextIconImports);
          }
        }}
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

          const nextRule = {
            id: draftRuleId,
            pattern: nextPattern,
            color,
            target,
            ...visualRule,
          };

          if (iconImports.length) {
            onAdd(nextRule, iconImports);
          } else {
            onAdd(nextRule);
          }
          setDraftRuleId(createLegendRuleId());
          setPattern('');
          setColor('#3B82F6');
          setVisualRule({});
          setIconImports([]);
        }}
        title={`Add ${target} legend`}
      >
        <MdiIcon path={mdiPlus} size={14} />
      </Button>
    </div>
  );
}

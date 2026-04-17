import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import type { IGroup } from '../../../../shared/settings/groups';
import { MdiIcon } from '../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/disclosure/collapsible';
import { LegendBuiltInRow } from './builtInRow';
import { LegendRuleCreateRow } from './createRow';
import { shouldRenderRuleInSection } from './displayRules';
import type { LegendBuiltInEntry, LegendDisplayRule, LegendTargetSection } from './types';
import { LegendRuleRow } from './ruleRow';
import { postLegendOrderUpdate } from './sectionOrder';

export function LegendSection({
  title,
  builtInEntries,
  displayRules,
  userRules,
  legends,
  target,
  onBuiltInColorChange,
  onRulesChange,
  onToggleDefaultVisibility,
}: {
  title: string;
  builtInEntries: LegendBuiltInEntry[];
  displayRules: LegendDisplayRule[];
  userRules: IGroup[];
  legends: IGroup[];
  target: LegendTargetSection;
  onBuiltInColorChange: (id: string, color: string) => void;
  onRulesChange: (rules: IGroup[]) => void;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDropRule = (event: React.DragEvent<HTMLDivElement>, targetIndex: number): void => {
    event.preventDefault();
    if (dragIndex === null) {
      setDragOverIndex(null);
      return;
    }

    postLegendOrderUpdate(displayRules, legends, target, dragIndex, targetIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="space-y-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/10"
            title={`Toggle ${title} legend section`}
          >
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </h3>
            <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={16} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
            {builtInEntries.map((entry) => (
              <LegendBuiltInRow
                key={entry.id}
                entry={entry}
                onChange={onBuiltInColorChange}
              />
            ))}
            {displayRules.map((rule, index) => (
              <LegendRuleRow
                key={rule.id}
                rule={rule}
                index={index}
                isDragging={dragIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDrop={(event) => handleDropRule(event, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onChange={(nextRule) => {
                  const targetRules = userRules.filter((candidate) =>
                    shouldRenderRuleInSection(candidate, target),
                  );
                  onRulesChange(
                    targetRules.map((candidate) => (candidate.id === nextRule.id ? nextRule : candidate)),
                  );
                }}
                onRemove={() => {
                  onRulesChange(userRules.filter((candidate) => candidate.id !== rule.id));
                }}
                onToggleDefaultVisibility={onToggleDefaultVisibility}
              />
            ))}
            <LegendRuleCreateRow
              target={target}
              onAdd={(rule) => {
                onRulesChange([...userRules, rule]);
              }}
            />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

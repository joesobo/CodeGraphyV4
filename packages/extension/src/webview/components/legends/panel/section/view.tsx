import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import { MdiIcon } from '../../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../ui/disclosure/collapsible';
import { LegendBuiltInRow } from './builtInRow';
import { LegendRuleCreateRow } from './createRow';
import { shouldRenderRuleInSection } from './displayRules';
import type { LegendBuiltInEntry, LegendDisplayRule, LegendTargetSection } from './contracts';
import { LegendRuleRow } from './ruleRow';
import { postLegendOrderUpdate } from './order';
import {
  createCustomRuleGroup,
  createPluginRuleGroups,
  type LegendRuleGroup,
  type LegendRuleRowModel,
} from './groups';

function LegendSubsection({
  children,
  group,
}: {
  children: React.ReactNode;
  group: Pick<LegendRuleGroup, 'id' | 'label'>;
}): React.ReactElement {
  return (
    <div
      data-testid="legend-rule-subsection"
      className="border-t border-border/60 bg-background/20 first:border-t-0"
    >
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{group.label}</span>
      </div>
      <div className="divide-y divide-border/50 bg-black/10">
        {children}
      </div>
    </div>
  );
}

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
  const customRuleGroup = createCustomRuleGroup(displayRules);
  const pluginRuleGroups = createPluginRuleGroups(displayRules);

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

  const renderRuleRow = ({ index, rule }: LegendRuleRowModel): React.ReactElement => (
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
  );

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
            {builtInEntries.length ? (
              <LegendSubsection group={{ id: 'built-in', label: 'Built in' }}>
                {builtInEntries.map((entry) => (
                  <LegendBuiltInRow
                    key={entry.id}
                    entry={entry}
                    onChange={onBuiltInColorChange}
                  />
                ))}
              </LegendSubsection>
            ) : null}
            <LegendSubsection group={customRuleGroup}>
              <LegendRuleCreateRow
                target={target}
                onAdd={(rule) => {
                  onRulesChange([...userRules, rule]);
                }}
              />
              {customRuleGroup.rules.map(renderRuleRow)}
            </LegendSubsection>
            {pluginRuleGroups.length ? (
              <LegendSubsection group={{ id: 'plugin-defaults', label: 'Plugin defaults' }}>
                <div className="space-y-2 p-2">
                  {pluginRuleGroups.map((group) => (
                    <div
                      key={group.id}
                      data-testid="legend-rule-subsection"
                      className="overflow-hidden rounded-md border border-border/50 bg-background/20"
                    >
                      <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                        {group.label}
                      </div>
                      <div className="divide-y divide-border/50">
                        {group.rules.map(renderRuleRow)}
                      </div>
                    </div>
                  ))}
                </div>
              </LegendSubsection>
            ) : null}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

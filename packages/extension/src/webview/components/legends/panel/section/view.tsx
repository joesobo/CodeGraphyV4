import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';
import { MdiIcon } from '../../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../ui/disclosure/collapsible';
import { LegendBuiltInRow } from './builtInRow';
import { LegendRuleCreateRow } from './createRow';
import { shouldRenderRuleInSection } from './displayRules';
import type {
  LegendBuiltInEntry,
  LegendDisplayRule,
  LegendRulesChange,
  LegendTargetSection,
} from './contracts';
import { LegendRuleRow } from './ruleRow';
import { postLegendOrderUpdate } from './order';
import {
  createCustomRuleGroup,
  createPluginRuleGroups,
  type LegendRuleGroup,
  type LegendRuleRowModel,
} from './groups';

interface LegendRuleRenderState {
  dragIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}

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

function emitRulesChange(
  onRulesChange: LegendRulesChange,
  rules: IGroup[],
  iconImports?: LegendIconImport[],
): void {
  if (iconImports?.length) {
    onRulesChange(rules, iconImports);
    return;
  }

  onRulesChange(rules);
}

function getTargetRules(userRules: IGroup[], target: LegendTargetSection): IGroup[] {
  return userRules.filter((candidate) => shouldRenderRuleInSection(candidate, target));
}

function replaceRule(rules: IGroup[], nextRule: IGroup): IGroup[] {
  return rules.map((candidate) => (candidate.id === nextRule.id ? nextRule : candidate));
}

function BuiltInRulesSubsection({
  builtInEntries,
  onBuiltInColorChange,
}: {
  builtInEntries: LegendBuiltInEntry[];
  onBuiltInColorChange: (id: string, color: string) => void;
}): React.ReactElement | null {
  if (!builtInEntries.length) {
    return null;
  }

  return (
    <LegendSubsection group={{ id: 'built-in', label: 'Built in' }}>
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

function CustomRulesSubsection({
  customRuleGroup,
  target,
  userRules,
  renderRuleRow,
  onRulesChange,
}: {
  customRuleGroup: LegendRuleGroup;
  target: LegendTargetSection;
  userRules: IGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onRulesChange: LegendRulesChange;
}): React.ReactElement {
  return (
    <LegendSubsection group={customRuleGroup}>
      <LegendRuleCreateRow
        target={target}
        onAdd={(rule, iconImports) => {
          emitRulesChange(onRulesChange, [...userRules, rule], iconImports);
        }}
      />
      {customRuleGroup.rules.map(renderRuleRow)}
    </LegendSubsection>
  );
}

function PluginRuleGroup({
  group,
  renderRuleRow,
}: {
  group: LegendRuleGroup;
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
}): React.ReactElement {
  return (
    <div
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
  );
}

function PluginRulesSubsection({
  pluginRuleGroups,
  renderRuleRow,
}: {
  pluginRuleGroups: LegendRuleGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
}): React.ReactElement | null {
  if (!pluginRuleGroups.length) {
    return null;
  }

  return (
    <LegendSubsection group={{ id: 'plugin-defaults', label: 'Plugin defaults' }}>
      <div className="space-y-2 p-2">
        {pluginRuleGroups.map((group) => (
          <PluginRuleGroup
            key={group.id}
            group={group}
            renderRuleRow={renderRuleRow}
          />
        ))}
      </div>
    </LegendSubsection>
  );
}

function SectionRules({
  builtInEntries,
  customRuleGroup,
  pluginRuleGroups,
  target,
  userRules,
  renderRuleRow,
  onBuiltInColorChange,
  onRulesChange,
}: {
  builtInEntries: LegendBuiltInEntry[];
  customRuleGroup: LegendRuleGroup;
  pluginRuleGroups: LegendRuleGroup[];
  target: LegendTargetSection;
  userRules: IGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onBuiltInColorChange: (id: string, color: string) => void;
  onRulesChange: LegendRulesChange;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
      <BuiltInRulesSubsection
        builtInEntries={builtInEntries}
        onBuiltInColorChange={onBuiltInColorChange}
      />
      <CustomRulesSubsection
        customRuleGroup={customRuleGroup}
        target={target}
        userRules={userRules}
        renderRuleRow={renderRuleRow}
        onRulesChange={onRulesChange}
      />
      <PluginRulesSubsection
        pluginRuleGroups={pluginRuleGroups}
        renderRuleRow={renderRuleRow}
      />
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
  onRulesChange: LegendRulesChange;
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

  const dragState: LegendRuleRenderState = {
    dragIndex,
    dragOverIndex,
    onDragStart: setDragIndex,
    onDragOver: setDragOverIndex,
    onDrop: handleDropRule,
    onDragEnd: () => {
      setDragIndex(null);
      setDragOverIndex(null);
    },
  };

  const renderRuleRow = ({ index, rule }: LegendRuleRowModel): React.ReactElement => (
    <LegendRuleRow
      key={rule.id}
      rule={rule}
      index={index}
      isDragging={dragState.dragIndex === index}
      isDragOver={dragState.dragOverIndex === index}
      onDragStart={() => dragState.onDragStart(index)}
      onDragOver={(event) => {
        event.preventDefault();
        dragState.onDragOver(index);
      }}
      onDrop={(event) => dragState.onDrop(event, index)}
      onDragEnd={dragState.onDragEnd}
      onChange={(nextRule, iconImports) => {
        const nextRules = replaceRule(getTargetRules(userRules, target), nextRule);
        emitRulesChange(onRulesChange, nextRules, iconImports);
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
          <SectionRules
            builtInEntries={builtInEntries}
            customRuleGroup={customRuleGroup}
            pluginRuleGroups={pluginRuleGroups}
            target={target}
            userRules={userRules}
            renderRuleRow={renderRuleRow}
            onBuiltInColorChange={onBuiltInColorChange}
            onRulesChange={onRulesChange}
          />
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

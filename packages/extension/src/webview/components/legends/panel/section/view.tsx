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
import { Switch } from '../../../ui/switch';
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
  createBuiltInRuleGroups,
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
  toggleChecked,
  toggleTitle,
  onToggle,
}: {
  children: React.ReactNode;
  group: Pick<LegendRuleGroup, 'id' | 'label'>;
  toggleChecked?: boolean;
  toggleTitle?: string;
  onToggle?: () => void;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const collapseTitle = `${open ? 'Collapse' : 'Expand'} ${group.label} legend entries`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        data-testid="legend-rule-subsection"
        className="border-t border-border/60 bg-background/20 first:border-t-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
              title={collapseTitle}
            >
              <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={14} />
              <span className="truncate">{group.label}</span>
            </button>
          </CollapsibleTrigger>
          {onToggle ? (
            <Switch
              checked={toggleChecked}
              title={toggleTitle}
              aria-label={toggleTitle}
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={onToggle}
            />
          ) : null}
        </div>
        <CollapsibleContent>
          <div className="divide-y divide-border/50 bg-black/10">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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

function areAllRulesEnabled(rules: LegendRuleRowModel[]): boolean {
  return rules.every(({ rule }) => !rule.disabled);
}

function setRulesDisabled(ruleIds: Set<string>, rules: IGroup[], disabled: boolean): IGroup[] {
  return rules.map((rule) => {
    if (!ruleIds.has(rule.id)) {
      return rule;
    }

    return { ...rule, disabled };
  });
}

function BuiltInRulesSubsection({
  builtInEntries,
  onBuiltInColorChange,
  onBuiltInColorToggle,
  target,
}: {
  builtInEntries: LegendBuiltInEntry[];
  onBuiltInColorChange: (id: string, color: string) => void;
  onBuiltInColorToggle?: (id: string, enabled: boolean) => void;
  target: LegendTargetSection;
}): React.ReactElement | null {
  if (!builtInEntries.length) {
    return null;
  }

  return (
    <LegendSubsection group={{ id: 'defaults', label: 'Defaults' }}>
      {builtInEntries.map((entry) => (
        <LegendBuiltInRow
          key={entry.id}
          entry={entry}
          onChange={onBuiltInColorChange}
          onToggleColor={onBuiltInColorToggle}
          showColorToggle={target === 'node'}
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
  const targetRules = getTargetRules(userRules, target);
  const allCustomRulesEnabled = areAllRulesEnabled(customRuleGroup.rules);

  return (
    <LegendSubsection
      group={customRuleGroup}
      toggleChecked={allCustomRulesEnabled}
      toggleTitle="Toggle Custom legend entries"
      onToggle={() => {
        const customRuleIds = new Set(customRuleGroup.rules.map(({ rule }) => rule.id));
        emitRulesChange(
          onRulesChange,
          setRulesDisabled(customRuleIds, targetRules, allCustomRulesEnabled),
        );
      }}
    >
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
  onToggleDefaultVisibility,
}: {
  group: LegendRuleGroup;
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const allPluginRulesEnabled = areAllRulesEnabled(group.rules);

  return (
    <LegendSubsection
      group={group}
      toggleChecked={allPluginRulesEnabled}
      toggleTitle={`Toggle ${group.label} legend entries`}
      onToggle={() => {
        const nextVisible = !allPluginRulesEnabled;
        group.rules.forEach(({ rule }) => onToggleDefaultVisibility(rule.id, nextVisible));
      }}
    >
      {group.rules.map(renderRuleRow)}
    </LegendSubsection>
  );
}

function PluginRulesSubsection({
  pluginRuleGroups,
  renderRuleRow,
  onToggleDefaultVisibility,
}: {
  pluginRuleGroups: LegendRuleGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
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
            onToggleDefaultVisibility={onToggleDefaultVisibility}
          />
        ))}
      </div>
    </LegendSubsection>
  );
}

function MaterialThemeRulesSubsection({
  builtInRuleGroups,
  renderRuleRow,
  onToggleDefaultVisibility,
}: {
  builtInRuleGroups: LegendRuleGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement | null {
  if (!builtInRuleGroups.length) {
    return null;
  }

  const materialRules = builtInRuleGroups.flatMap((group) => group.rules);
  const allMaterialRulesEnabled = areAllRulesEnabled(materialRules);

  return (
    <LegendSubsection
      group={{ id: 'material-icon-theme', label: 'Material Icon Theme' }}
      toggleChecked={allMaterialRulesEnabled}
      toggleTitle="Toggle Material Icon Theme legend entries"
      onToggle={() => {
        const nextVisible = !allMaterialRulesEnabled;
        materialRules.forEach(({ rule }) => onToggleDefaultVisibility(rule.id, nextVisible));
      }}
    >
      {materialRules.map(renderRuleRow)}
    </LegendSubsection>
  );
}

function SectionRules({
  builtInEntries,
  builtInRuleGroups,
  customRuleGroup,
  pluginRuleGroups,
  target,
  userRules,
  renderRuleRow,
  onBuiltInColorChange,
  onBuiltInColorToggle,
  onRulesChange,
  onToggleDefaultVisibility,
}: {
  builtInEntries: LegendBuiltInEntry[];
  builtInRuleGroups: LegendRuleGroup[];
  customRuleGroup: LegendRuleGroup;
  pluginRuleGroups: LegendRuleGroup[];
  target: LegendTargetSection;
  userRules: IGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onBuiltInColorChange: (id: string, color: string) => void;
  onBuiltInColorToggle?: (id: string, enabled: boolean) => void;
  onRulesChange: LegendRulesChange;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
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
        onToggleDefaultVisibility={onToggleDefaultVisibility}
      />
      <MaterialThemeRulesSubsection
        builtInRuleGroups={builtInRuleGroups}
        renderRuleRow={renderRuleRow}
        onToggleDefaultVisibility={onToggleDefaultVisibility}
      />
      <BuiltInRulesSubsection
        builtInEntries={builtInEntries}
        onBuiltInColorChange={onBuiltInColorChange}
        onBuiltInColorToggle={onBuiltInColorToggle}
        target={target}
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
  onBuiltInColorToggle,
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
  onBuiltInColorToggle?: (id: string, enabled: boolean) => void;
  onRulesChange: LegendRulesChange;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const builtInRuleGroups = createBuiltInRuleGroups(displayRules);
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
            builtInRuleGroups={builtInRuleGroups}
            customRuleGroup={customRuleGroup}
            pluginRuleGroups={pluginRuleGroups}
            target={target}
            userRules={userRules}
            renderRuleRow={renderRuleRow}
            onBuiltInColorChange={onBuiltInColorChange}
            onBuiltInColorToggle={onBuiltInColorToggle}
            onRulesChange={onRulesChange}
            onToggleDefaultVisibility={onToggleDefaultVisibility}
          />
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

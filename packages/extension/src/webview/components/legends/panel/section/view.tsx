import React from 'react';
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

interface LegendCollapseProps {
  collapsedEntries?: Record<string, boolean>;
  onCollapsedChange?: (entryId: string, collapsed: boolean) => void;
  storageKey: string;
}

function useCollapsibleEntryState({
  collapsedEntries,
  onCollapsedChange,
  storageKey,
}: LegendCollapseProps): {
  collapsed: boolean;
  onOpenChange: (nextOpen: boolean) => void;
} {
  const resolvedCollapsedEntries = collapsedEntries ?? {};
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(
    resolvedCollapsedEntries[storageKey] ?? false,
  );
  const collapsed = onCollapsedChange
    ? (resolvedCollapsedEntries[storageKey] ?? false)
    : uncontrolledCollapsed;

  return {
    collapsed,
    onOpenChange: (nextOpen: boolean) => {
      if (onCollapsedChange) {
        onCollapsedChange(storageKey, !nextOpen);
        return;
      }

      setUncontrolledCollapsed(!nextOpen);
    },
  };
}

function LegendSubsection({
  children,
  collapsedEntries,
  group,
  onCollapsedChange,
  onToggle,
  storageKey,
  toggleChecked,
  toggleTitle,
}: LegendCollapseProps & {
  children: React.ReactNode;
  group: Pick<LegendRuleGroup, 'id' | 'label'>;
  toggleChecked?: boolean;
  toggleTitle?: string;
  onToggle?: () => void;
}): React.ReactElement {
  const { collapsed, onOpenChange } = useCollapsibleEntryState({
    collapsedEntries,
    onCollapsedChange,
    storageKey,
  });
  const open = !collapsed;
  const collapseTitle = `${open ? 'Collapse' : 'Expand'} ${group.label} legend entries`;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
    >
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
  collapsedEntries,
  onBuiltInColorChange,
  onBuiltInColorToggle,
  onCollapsedChange,
  target,
}: LegendCollapseProps & {
  builtInEntries: LegendBuiltInEntry[];
  onBuiltInColorChange: (id: string, color: string) => void;
  onBuiltInColorToggle?: (id: string, enabled: boolean) => void;
  target: LegendTargetSection;
}): React.ReactElement | null {
  if (!builtInEntries.length) {
    return null;
  }

  return (
    <LegendSubsection
      collapsedEntries={collapsedEntries}
      group={{ id: 'defaults', label: 'Defaults' }}
      onCollapsedChange={onCollapsedChange}
      storageKey={`${target}:defaults`}
    >
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
  collapsedEntries,
  customRuleGroup,
  onCollapsedChange,
  onRulesChange,
  renderRuleRow,
  target,
  userRules,
}: LegendCollapseProps & {
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
      collapsedEntries={collapsedEntries}
      group={customRuleGroup}
      onCollapsedChange={onCollapsedChange}
      storageKey={`${target}:custom`}
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
  collapsedEntries,
  group,
  onCollapsedChange,
  onToggleDefaultVisibilityBatch,
  renderRuleRow,
}: LegendCollapseProps & {
  group: LegendRuleGroup;
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibilityBatch: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement {
  const allPluginRulesEnabled = areAllRulesEnabled(group.rules);

  return (
    <LegendSubsection
      collapsedEntries={collapsedEntries}
      group={group}
      onCollapsedChange={onCollapsedChange}
      storageKey={`plugin:${group.id}`}
      toggleChecked={allPluginRulesEnabled}
      toggleTitle={`Toggle ${group.label} legend entries`}
      onToggle={() => {
        onToggleDefaultVisibilityBatch(
          group.rules.map(({ rule }) => rule.id),
          !allPluginRulesEnabled,
        );
      }}
    >
      {group.rules.map(renderRuleRow)}
    </LegendSubsection>
  );
}

function PluginRulesSubsection({
  collapsedEntries,
  onCollapsedChange,
  onToggleDefaultVisibilityBatch,
  pluginRuleGroups,
  renderRuleRow,
}: LegendCollapseProps & {
  pluginRuleGroups: LegendRuleGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibilityBatch: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement | null {
  if (!pluginRuleGroups.length) {
    return null;
  }

  return (
    <LegendSubsection
      collapsedEntries={collapsedEntries}
      group={{ id: 'plugin-defaults', label: 'Plugin defaults' }}
      onCollapsedChange={onCollapsedChange}
      storageKey="plugin-defaults"
    >
      <div className="space-y-2 p-2">
        {pluginRuleGroups.map((group) => (
          <PluginRuleGroup
            key={group.id}
            collapsedEntries={collapsedEntries}
            group={group}
            onCollapsedChange={onCollapsedChange}
            onToggleDefaultVisibilityBatch={onToggleDefaultVisibilityBatch}
            renderRuleRow={renderRuleRow}
            storageKey={`plugin:${group.id}`}
          />
        ))}
      </div>
    </LegendSubsection>
  );
}

function MaterialThemeRulesSubsection({
  builtInRuleGroups,
  collapsedEntries,
  onCollapsedChange,
  onToggleDefaultVisibilityBatch,
  renderRuleRow,
}: LegendCollapseProps & {
  builtInRuleGroups: LegendRuleGroup[];
  renderRuleRow: (row: LegendRuleRowModel) => React.ReactElement;
  onToggleDefaultVisibilityBatch: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement | null {
  if (!builtInRuleGroups.length) {
    return null;
  }

  const materialRules = builtInRuleGroups.flatMap((group) => group.rules);
  const allMaterialRulesEnabled = areAllRulesEnabled(materialRules);

  return (
    <LegendSubsection
      collapsedEntries={collapsedEntries}
      group={{ id: 'material-icon-theme', label: 'Material Icon Theme' }}
      onCollapsedChange={onCollapsedChange}
      storageKey="material-icon-theme"
      toggleChecked={allMaterialRulesEnabled}
      toggleTitle="Toggle Material Icon Theme legend entries"
      onToggle={() => {
        onToggleDefaultVisibilityBatch(
          materialRules.map(({ rule }) => rule.id),
          !allMaterialRulesEnabled,
        );
      }}
    >
      {materialRules.map(renderRuleRow)}
    </LegendSubsection>
  );
}

function SectionRules({
  builtInEntries,
  builtInRuleGroups,
  collapsedEntries,
  customRuleGroup,
  onBuiltInColorChange,
  onBuiltInColorToggle,
  onCollapsedChange,
  onRulesChange,
  onToggleDefaultVisibilityBatch,
  pluginRuleGroups,
  renderRuleRow,
  target,
  userRules,
}: LegendCollapseProps & {
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
  onToggleDefaultVisibilityBatch: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
      <CustomRulesSubsection
        collapsedEntries={collapsedEntries}
        customRuleGroup={customRuleGroup}
        onCollapsedChange={onCollapsedChange}
        onRulesChange={onRulesChange}
        renderRuleRow={renderRuleRow}
        storageKey={`${target}:custom`}
        target={target}
        userRules={userRules}
      />
      <PluginRulesSubsection
        collapsedEntries={collapsedEntries}
        onCollapsedChange={onCollapsedChange}
        onToggleDefaultVisibilityBatch={onToggleDefaultVisibilityBatch}
        pluginRuleGroups={pluginRuleGroups}
        renderRuleRow={renderRuleRow}
        storageKey="plugin-defaults"
      />
      <MaterialThemeRulesSubsection
        builtInRuleGroups={builtInRuleGroups}
        collapsedEntries={collapsedEntries}
        onCollapsedChange={onCollapsedChange}
        onToggleDefaultVisibilityBatch={onToggleDefaultVisibilityBatch}
        renderRuleRow={renderRuleRow}
        storageKey="material-icon-theme"
      />
      <BuiltInRulesSubsection
        builtInEntries={builtInEntries}
        collapsedEntries={collapsedEntries}
        onBuiltInColorChange={onBuiltInColorChange}
        onBuiltInColorToggle={onBuiltInColorToggle}
        onCollapsedChange={onCollapsedChange}
        storageKey={`${target}:defaults`}
        target={target}
      />
    </div>
  );
}

export function LegendSection({
  title,
  builtInEntries,
  collapsedEntries,
  displayRules,
  legends,
  onBuiltInColorChange,
  onBuiltInColorToggle,
  onCollapsedChange,
  onRulesChange,
  onToggleDefaultVisibility,
  onToggleDefaultVisibilityBatch = () => {},
  target,
  userRules,
}: {
  title: string;
  builtInEntries: LegendBuiltInEntry[];
  collapsedEntries: Record<string, boolean>;
  displayRules: LegendDisplayRule[];
  userRules: IGroup[];
  legends: IGroup[];
  target: LegendTargetSection;
  onBuiltInColorChange: (id: string, color: string) => void;
  onBuiltInColorToggle?: (id: string, enabled: boolean) => void;
  onCollapsedChange?: (entryId: string, collapsed: boolean) => void;
  onRulesChange: LegendRulesChange;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
  onToggleDefaultVisibilityBatch?: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement {
  const sectionStorageKey = `section:${title.toLowerCase()}`;
  const { collapsed, onOpenChange } = useCollapsibleEntryState({
    collapsedEntries,
    onCollapsedChange,
    storageKey: sectionStorageKey,
  });
  const open = !collapsed;
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
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
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
    >
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
            collapsedEntries={collapsedEntries}
            customRuleGroup={customRuleGroup}
            onBuiltInColorChange={onBuiltInColorChange}
            onBuiltInColorToggle={onBuiltInColorToggle}
            onCollapsedChange={onCollapsedChange}
            onRulesChange={onRulesChange}
            onToggleDefaultVisibilityBatch={onToggleDefaultVisibilityBatch}
            pluginRuleGroups={pluginRuleGroups}
            renderRuleRow={renderRuleRow}
            storageKey={sectionStorageKey}
            target={target}
            userRules={userRules}
          />
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

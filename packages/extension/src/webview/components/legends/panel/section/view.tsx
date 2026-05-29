import React from 'react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import { MdiIcon } from '../../../icons/MdiIcon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../ui/disclosure/collapsible';
import { useCollapsibleEntryState } from './collapseState';
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
  type LegendRuleRowModel,
} from './groups';
import { SectionRules } from './rulesLayout';
import {
  emitRulesChange,
  getTargetRules,
  replaceRule,
} from './rulesModel';

interface LegendRuleRenderState {
  dragIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}

export function LegendSection({
  title,
  builtInEntries,
  collapsedEntries,
  displayRules,
  legends,
  onBuiltInColorChange,
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
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-[var(--cg-accent-faint)]"
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

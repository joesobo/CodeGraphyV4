import React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import type {
  LegendBuiltInEntry,
  LegendRulesChange,
  LegendTargetSection,
} from './contracts';
import type { LegendRuleGroup, LegendRuleRowModel } from './groups';
import type { LegendCollapseProps } from './collapseState';
import { BuiltInRulesSubsection } from './builtInSubsection';
import { CustomRulesSubsection } from './customSubsection';
import { MaterialThemeRulesSubsection } from './materialSubsection';
import { PluginRulesSubsection } from './pluginSubsection';

export function getCustomSectionStorageKey(target: LegendTargetSection): string {
  return `${target}:custom`;
}

export function getDefaultSectionStorageKey(target: LegendTargetSection): string {
  return `${target}:defaults`;
}

export function SectionRules({
  builtInEntries,
  builtInRuleGroups,
  collapsedEntries,
  customRuleGroup,
  onBuiltInColorChange,
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
  onRulesChange: LegendRulesChange;
  onToggleDefaultVisibilityBatch: (legendIds: string[], visible: boolean) => void;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]">
      <CustomRulesSubsection
        collapsedEntries={collapsedEntries}
        customRuleGroup={customRuleGroup}
        onCollapsedChange={onCollapsedChange}
        onRulesChange={onRulesChange}
        renderRuleRow={renderRuleRow}
        storageKey={getCustomSectionStorageKey(target)}
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
        onCollapsedChange={onCollapsedChange}
        storageKey={getDefaultSectionStorageKey(target)}
        target={target}
      />
    </div>
  );
}

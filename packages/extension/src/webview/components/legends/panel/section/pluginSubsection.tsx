import React from 'react';
import type { LegendRuleGroup, LegendRuleRowModel } from './groups';
import type { LegendCollapseProps } from './collapseState';
import { LegendSubsection } from './subsection';
import { areAllRulesEnabled } from './rulesModel';

export function getPluginRuleGroupStorageKey(groupId: string): string {
  return `plugin:${groupId}`;
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
      storageKey={getPluginRuleGroupStorageKey(group.id)}
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

export function PluginRulesSubsection({
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
      group={{ label: 'Plugins' }}
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
            storageKey={getPluginRuleGroupStorageKey(group.id)}
          />
        ))}
      </div>
    </LegendSubsection>
  );
}

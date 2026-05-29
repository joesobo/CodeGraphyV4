import React from 'react';
import type { LegendRuleGroup, LegendRuleRowModel } from './groups';
import type { LegendCollapseProps } from './collapseState';
import { LegendSubsection } from './subsection';
import { areAllRulesEnabled } from './rulesModel';

export function MaterialThemeRulesSubsection({
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
      group={{ label: 'Material Icon Theme' }}
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

import React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import { LegendRuleCreateRow } from './createRow';
import type { LegendRulesChange, LegendTargetSection } from './contracts';
import type { LegendRuleGroup, LegendRuleRowModel } from './groups';
import type { LegendCollapseProps } from './collapseState';
import { LegendSubsection } from './subsection';
import {
  areAllRulesEnabled,
  emitRulesChange,
  getTargetRules,
  setRulesDisabled,
} from './rulesModel';

export function CustomRulesSubsection({
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

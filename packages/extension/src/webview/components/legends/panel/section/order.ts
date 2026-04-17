import type { IGroup } from '../../../../../shared/settings/groups';
import { postMessage } from '../../../../vscodeApi';
import { resolveDisplayRules } from './displayRules';
import { reorderItems } from '../messages';
import type { LegendDisplayRule, LegendTargetSection } from './contracts';

export function postLegendOrderUpdate(
  displayRules: LegendDisplayRule[],
  legends: IGroup[],
  target: LegendTargetSection,
  dragIndex: number,
  targetIndex: number,
): void {
  const reorderedSectionRuleIds = reorderItems(displayRules, dragIndex, targetIndex).map(
    rule => rule.id,
  );
  const otherSectionTarget: LegendTargetSection = target === 'node' ? 'edge' : 'node';
  const otherSectionRuleIds = resolveDisplayRules(legends, otherSectionTarget).map(rule => rule.id);
  const legendIds =
    target === 'node'
      ? [...reorderedSectionRuleIds, ...otherSectionRuleIds]
      : [...otherSectionRuleIds, ...reorderedSectionRuleIds];

  postMessage({
    type: 'UPDATE_LEGEND_ORDER',
    payload: { legendIds },
  });
}

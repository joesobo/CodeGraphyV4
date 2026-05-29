import type { IGroup } from '../../../../../shared/settings/groups';
import {
  isEdgeTypeColorRule,
  ruleTargetsEdges,
} from '../../../../graphControls/edgeTypeColors';
import { shouldRenderRuleInSection } from '../section/displayRules';

export function upsertEdgeTypeColorRule(
  rules: IGroup[],
  edgeKind: string,
  color: string,
): IGroup[] {
  const nextRules = [...rules];
  const index = nextRules.findIndex(
    (rule) => ruleTargetsEdges(rule) && rule.pattern === edgeKind,
  );
  const currentRule = index >= 0 ? nextRules[index] : undefined;
  const nextRule: IGroup = {
    id: currentRule?.id ?? `legend:edge:${edgeKind}`,
    pattern: edgeKind,
    target: 'edge',
    color,
  };

  if (index >= 0) {
    nextRules[index] = {
      ...currentRule,
      ...nextRule,
    };
    return nextRules;
  }

  return [...nextRules, nextRule];
}

export function replaceCustomEdgeRules(
  rules: IGroup[],
  edgeTypeIds: ReadonlySet<string>,
  nextSectionRules: IGroup[],
): IGroup[] {
  const remainingRules = rules.filter((rule) =>
    !shouldRenderRuleInSection(rule, 'edge') || isEdgeTypeColorRule(rule, edgeTypeIds),
  );
  return [...remainingRules, ...nextSectionRules];
}

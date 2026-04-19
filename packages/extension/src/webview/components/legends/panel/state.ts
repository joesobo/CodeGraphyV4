import { useMemo } from 'react';
import type { IGroup } from '../../../../shared/settings/groups';
import {
  resolveDisplayRules,
  shouldRenderRuleInSection,
} from './section/displayRules';
import type { LegendBuiltInEntry } from './section/contracts';

interface PanelStateInput {
  edgeColors: Record<string, string>;
  edgeTypes: Array<{ id: string; label: string; defaultColor: string }>;
  legends: IGroup[];
  nodeColors: Record<string, string>;
  nodeTypes: Array<{ id: string; label: string; defaultColor: string }>;
}

function createBuiltInEntries(
  types: Array<{ id: string; label: string; defaultColor: string }>,
  colors: Record<string, string>,
): LegendBuiltInEntry[] {
  return types.map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: colors[entry.id] ?? entry.defaultColor,
  }));
}

function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

function createEdgeTypeIdSet(edgeTypes: Array<{ id: string }>): Set<string> {
  return new Set(edgeTypes.map((edgeType) => edgeType.id));
}

export function isEdgeTypeColorRule(rule: IGroup, edgeTypeIds: ReadonlySet<string>): boolean {
  return !rule.isPluginDefault && ruleTargetsEdges(rule) && edgeTypeIds.has(rule.pattern);
}

function resolveEdgeTypeColorRules(
  rules: IGroup[],
  edgeTypeIds: ReadonlySet<string>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const rule of [...rules].filter((entry) => !entry.disabled).reverse()) {
    if (isEdgeTypeColorRule(rule, edgeTypeIds)) {
      colors[rule.pattern] = rule.color;
    }
  }

  return colors;
}

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

export function useLegendPanelState({
  edgeColors,
  edgeTypes,
  legends,
  nodeColors,
  nodeTypes,
}: PanelStateInput) {
  const userLegendRules = useMemo(
    () => legends.filter((group) => !group.isPluginDefault),
    [legends],
  );
  const edgeTypeIds = useMemo(
    () => createEdgeTypeIdSet(edgeTypes),
    [edgeTypes],
  );
  const userDisplayLegendRules = useMemo(
    () => userLegendRules.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
    [edgeTypeIds, userLegendRules],
  );
  const nodeLegendRules = useMemo(
    () => userDisplayLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'node')),
    [userDisplayLegendRules],
  );
  const edgeLegendRules = useMemo(
    () => userDisplayLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'edge')),
    [userDisplayLegendRules],
  );
  const displayedNodeLegendRules = useMemo(
    () => resolveDisplayRules(
      legends.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
      'node',
    ),
    [edgeTypeIds, legends],
  );
  const displayedEdgeLegendRules = useMemo(
    () => resolveDisplayRules(
      legends.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
      'edge',
    ),
    [edgeTypeIds, legends],
  );
  const nodeEntries = useMemo(
    () => createBuiltInEntries(nodeTypes, nodeColors),
    [nodeColors, nodeTypes],
  );
  const edgeTypeRuleColors = useMemo(
    () => resolveEdgeTypeColorRules(userLegendRules, edgeTypeIds),
    [edgeTypeIds, userLegendRules],
  );
  const edgeEntries = useMemo(
    () => createBuiltInEntries(edgeTypes, { ...edgeColors, ...edgeTypeRuleColors }),
    [edgeColors, edgeTypeRuleColors, edgeTypes],
  );

  return {
    displayedEdgeLegendRules,
    displayedNodeLegendRules,
    edgeEntries,
    edgeLegendRules,
    nodeEntries,
    nodeLegendRules,
    edgeTypeIds,
    userLegendRules,
  };
}

import { useMemo } from 'react';
import type { IGroup } from '../../../../shared/settings/groups';
import type { PendingGroupUpdates } from '../../../store/optimistic/groups/updates';
import { applyPendingGroupUpdates } from '../../../store/optimistic/groups/updates';
import {
  resolveDisplayRules,
  shouldRenderRuleInSection,
} from './section/displayRules';
import type { LegendBuiltInEntry } from './section/contracts';
import {
  createEdgeTypeIdSet,
  isEdgeTypeColorRule,
  resolveEdgeTypeColors,
  ruleTargetsEdges,
} from '../../../graphControls/edgeTypeColors';

interface PanelStateInput {
  edgeTypes: Array<{ id: string; label: string; defaultColor: string }>;
  legends: IGroup[];
  nodeColorEnabled: Record<string, boolean>;
  nodeColors: Record<string, string>;
  nodeTypes: Array<{ id: string; label: string; defaultColor: string }>;
  optimisticLegendUpdates?: PendingGroupUpdates;
}

function createBuiltInEntries(
  types: Array<{ id: string; label: string; defaultColor: string }>,
  colors: Record<string, string>,
  enabled?: Record<string, boolean>,
): LegendBuiltInEntry[] {
  return types.map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: colors[entry.id] ?? entry.defaultColor,
    colorEnabled: enabled?.[entry.id] ?? true,
    defaultColor: entry.defaultColor,
  }));
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
  edgeTypes,
  legends,
  nodeColorEnabled,
  nodeColors,
  nodeTypes,
  optimisticLegendUpdates = {},
}: PanelStateInput) {
  const resolvedLegends = useMemo(
    () => applyPendingGroupUpdates(legends, optimisticLegendUpdates).groups,
    [legends, optimisticLegendUpdates],
  );
  const userLegendRules = useMemo(
    () => resolvedLegends.filter((group) => !group.isPluginDefault),
    [resolvedLegends],
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
      resolvedLegends.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
      'node',
    ),
    [edgeTypeIds, resolvedLegends],
  );
  const displayedEdgeLegendRules = useMemo(
    () => resolveDisplayRules(
      resolvedLegends.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
      'edge',
    ),
    [edgeTypeIds, resolvedLegends],
  );
  const nodeEntries = useMemo(
    () => createBuiltInEntries(nodeTypes, nodeColors, nodeColorEnabled),
    [nodeColorEnabled, nodeColors, nodeTypes],
  );
  const edgeTypeColors = useMemo(
    () => resolveEdgeTypeColors(edgeTypes, resolvedLegends),
    [edgeTypes, resolvedLegends],
  );
  const edgeEntries = useMemo(
    () => createBuiltInEntries(edgeTypes, edgeTypeColors),
    [edgeTypeColors, edgeTypes],
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

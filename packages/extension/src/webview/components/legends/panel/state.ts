import { useMemo } from 'react';
import type { IGroup } from '../../../../shared/settings/groups';
import type { PendingGroupUpdates } from '../../../store/optimistic/groups/updates';
import { applyPendingGroupUpdates } from '../../../store/optimistic/groups/updates';
import {
  resolveDisplayRules,
  shouldRenderRuleInSection,
} from './section/displayRules';
import {
  createEdgeTypeIdSet,
  isEdgeTypeColorRule,
  resolveEdgeTypeColors,
} from '../../../graphControls/edgeTypeColors';
import { createBuiltInEntries } from './state/builtInEntries';
export {
  replaceCustomEdgeRules,
  upsertEdgeTypeColorRule,
} from './state/edgeRules';

interface PanelStateInput {
  edgeTypes: Array<{ id: string; label: string; defaultColor: string }>;
  legends: IGroup[];
  nodeColors: Record<string, string>;
  nodeTypes: Array<{ id: string; label: string; defaultColor: string }>;
  optimisticLegendUpdates?: PendingGroupUpdates;
}

export function useLegendPanelState({
  edgeTypes,
  legends,
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
  const displayLegendRules = useMemo(
    () => resolvedLegends.filter((rule) => !isEdgeTypeColorRule(rule, edgeTypeIds)),
    [edgeTypeIds, resolvedLegends],
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
    () => resolveDisplayRules(displayLegendRules, 'node'),
    [displayLegendRules],
  );
  const displayedEdgeLegendRules = useMemo(
    () => resolveDisplayRules(displayLegendRules, 'edge'),
    [displayLegendRules],
  );
  const nodeEntries = useMemo(
    () => createBuiltInEntries(nodeTypes, nodeColors),
    [nodeColors, nodeTypes],
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

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
  const nodeLegendRules = useMemo(
    () => userLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'node')),
    [userLegendRules],
  );
  const edgeLegendRules = useMemo(
    () => userLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'edge')),
    [userLegendRules],
  );
  const displayedNodeLegendRules = useMemo(
    () => resolveDisplayRules(legends, 'node'),
    [legends],
  );
  const displayedEdgeLegendRules = useMemo(
    () => resolveDisplayRules(legends, 'edge'),
    [legends],
  );
  const nodeEntries = useMemo(
    () => createBuiltInEntries(nodeTypes, nodeColors),
    [nodeColors, nodeTypes],
  );
  const edgeEntries = useMemo(
    () => createBuiltInEntries(edgeTypes, edgeColors),
    [edgeColors, edgeTypes],
  );

  return {
    displayedEdgeLegendRules,
    displayedNodeLegendRules,
    edgeEntries,
    edgeLegendRules,
    nodeEntries,
    nodeLegendRules,
    userLegendRules,
  };
}

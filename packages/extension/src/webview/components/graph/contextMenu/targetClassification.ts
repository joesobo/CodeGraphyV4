import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { GraphContextMenuDecision } from './decision/model';

export interface ClassifiedTarget {
  targetId: string;
  targetType: 'node' | 'edge';
  eligibleItems: IPluginContextMenuItem[];
}

type PluginTargetType = ClassifiedTarget['targetType'];
type SingleNodeDecision = Extract<GraphContextMenuDecision, {
  kind:
    | 'singleFileNode'
    | 'singleFolderNode'
    | 'singlePackageNode'
    | 'singlePluginNode';
}>;

const SINGLE_NODE_DECISION_KINDS = new Set<SingleNodeDecision['kind']>([
  'singleFileNode',
  'singleFolderNode',
  'singlePackageNode',
  'singlePluginNode',
]);

function isSingleNodeDecision(decision: GraphContextMenuDecision): decision is SingleNodeDecision {
  return SINGLE_NODE_DECISION_KINDS.has(decision.kind as SingleNodeDecision['kind']);
}

function itemMatchesTargetType(item: IPluginContextMenuItem, targetType: PluginTargetType): boolean {
  return item.when === targetType || item.when === 'both';
}

function buildClassifiedTarget(
  targetId: string,
  targetType: PluginTargetType,
  pluginItems: readonly IPluginContextMenuItem[],
): ClassifiedTarget {
  return {
    targetId,
    targetType,
    eligibleItems: pluginItems.filter(item => itemMatchesTargetType(item, targetType)),
  };
}

export function classifyPluginTarget(
  decision: GraphContextMenuDecision,
  pluginItems: readonly IPluginContextMenuItem[]
): ClassifiedTarget | null {
  if (isSingleNodeDecision(decision)) {
    return buildClassifiedTarget(decision.target.id, 'node', pluginItems);
  }

  if (decision.kind === 'edge' && decision.edgeId) {
    return buildClassifiedTarget(decision.edgeId, 'edge', pluginItems);
  }

  return null;
}

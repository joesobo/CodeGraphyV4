import type { IGroup } from '../../../../shared/settings/groups';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { CORE_SYMBOL_GROUPS } from './symbols/core';
import { symbolGroupMatchesNode } from './symbols/matching';
import { PLUGIN_SYMBOL_GROUPS } from './symbols/plugins';

export function getSymbolDefaultGroups(graphData: IGraphData): IGroup[] {
  return [...CORE_SYMBOL_GROUPS, ...PLUGIN_SYMBOL_GROUPS]
    .filter((group) => graphData.nodes.some((node) => symbolGroupMatchesNode(group, node)))
    .map((group) => ({
      pattern: '**',
      isPluginDefault: true,
      pluginName: 'CodeGraphy',
      ...group,
    }));
}

import { buildGraphTooltipContext, buildGraphTooltipState } from '../../tooltip/model';
import type { FGNode } from '../../model/build';
import { isPackageNodeId } from '../../model/node/identity';
import type { TooltipHoverOptions } from './hover';

function shouldRequestFileInfo(node: FGNode): boolean {
  const pluginNode = typeof node.ownerPluginId === 'string' || typeof node.runtimeNodeType === 'string';
  return node.nodeType !== 'package' && !isPackageNodeId(node.id) && !pluginNode;
}

export function scheduleTooltipHover(node: FGNode, options: Pick<TooltipHoverOptions,
  'dataRef' | 'fileInfoCacheRef' | 'getNodeRect' | 'pluginHost' | 'postMessage'
  | 'legends' | 'setTooltipData' | 'startTracking' | 'tooltipTimeoutRef'>): void {
  options.tooltipTimeoutRef.current = setTimeout(() => {
    const pluginTooltip = options.pluginHost?.getTooltipContent(buildGraphTooltipContext({ node, snapshot: options.dataRef.current }));
    const tooltipState = buildGraphTooltipState({
      nodeId: node.id, snapshot: options.dataRef.current, rect: options.getNodeRect(node),
      cachedInfo: options.fileInfoCacheRef.current.get(node.id) ?? null,
      legends: options.legends,
      pluginActions: pluginTooltip?.actions ?? [], pluginSections: pluginTooltip?.sections ?? [],
    });
    options.setTooltipData(tooltipState.tooltipData);
    if (tooltipState.shouldRequestFileInfo && shouldRequestFileInfo(node)) {
      options.postMessage({ type: 'GET_FILE_INFO', payload: { path: node.id } });
    }
    options.startTracking();
  }, 500);
}

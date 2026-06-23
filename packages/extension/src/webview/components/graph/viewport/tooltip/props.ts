import type { ComponentProps } from 'react';
import { NodeTooltip } from '../../../nodeTooltip/view';
import type { ViewportProps } from '../contracts';

type NodeTooltipComponentProps = ComponentProps<typeof NodeTooltip>;

export function createNodeTooltipProps({
  pluginHost,
  tooltipData,
}: Pick<ViewportProps, 'pluginHost' | 'tooltipData'>): NodeTooltipComponentProps {
  return {
    extraActions: tooltipData.pluginActions,
    extraSections: tooltipData.pluginSections,
    incomingCount: tooltipData.incomingCount ?? tooltipData.info?.incomingCount ?? 0,
    lastModified: tooltipData.info?.lastModified,
    nodeRect: tooltipData.nodeRect,
    outgoingCount: tooltipData.outgoingCount ?? tooltipData.info?.outgoingCount ?? 0,
    path: tooltipData.path,
    plugin: tooltipData.info?.plugin ?? tooltipData.symbol?.plugin,
    pluginHost,
    size: tooltipData.info?.size,
    symbol: tooltipData.symbol,
    visible: tooltipData.visible,
  };
}

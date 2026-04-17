import React from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { useLegendPanelState } from './state';
import { LegendSection } from './section';
import {
  replaceSectionRules,
  sendUserLegendRules,
} from './rules';

interface LegendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegendsPanel({
  isOpen,
  onClose,
}: LegendsPanelProps): React.ReactElement | null {
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const nodeColors = useGraphStore((state) => state.nodeColors);
  const edgeColors = useGraphStore((state) => state.edgeColors);
  const legends = useGraphStore((state) => state.legends);
  const setOptimisticLegendUpdate = useGraphStore((state) => state.setOptimisticLegendUpdate);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);

  const {
    displayedEdgeLegendRules,
    displayedNodeLegendRules,
    edgeEntries,
    edgeLegendRules,
    nodeEntries,
    nodeLegendRules,
    userLegendRules,
  } = useLegendPanelState({
    edgeColors,
    edgeTypes,
    legends,
    nodeColors,
    nodeTypes,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Legends</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 px-3 pb-3 pt-2">
          <LegendSection
            title="Nodes"
            builtInEntries={nodeEntries}
            displayRules={displayedNodeLegendRules}
            userRules={nodeLegendRules}
            legends={legends}
            target="node"
            onBuiltInColorChange={(nodeType, color) => {
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: { nodeType, color },
              });
            }}
            onRulesChange={(nextSectionRules) => {
              sendUserLegendRules(
                replaceSectionRules(userLegendRules, 'node', nextSectionRules),
                setOptimisticUserLegends,
              );
            }}
            onToggleDefaultVisibility={(legendId, visible) => {
              setOptimisticLegendUpdate(legendId, { disabled: !visible });
              postMessage({
                type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                payload: { legendId, visible },
              });
            }}
          />
          <LegendSection
            title="Edges"
            builtInEntries={edgeEntries}
            displayRules={displayedEdgeLegendRules}
            userRules={edgeLegendRules}
            legends={legends}
            target="edge"
            onBuiltInColorChange={(edgeKind, color) => {
              postMessage({
                type: 'UPDATE_EDGE_COLOR',
                payload: { edgeKind, color },
              });
            }}
            onRulesChange={(nextSectionRules) => {
              sendUserLegendRules(
                replaceSectionRules(userLegendRules, 'edge', nextSectionRules),
                setOptimisticUserLegends,
              );
            }}
            onToggleDefaultVisibility={(legendId, visible) => {
              setOptimisticLegendUpdate(legendId, { disabled: !visible });
              postMessage({
                type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                payload: { legendId, visible },
              });
            }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

import React, { useMemo, useRef, useState } from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import {
  replaceCustomEdgeRules,
  upsertEdgeTypeColorRule,
  useLegendPanelState,
} from './state';
import { replaceSectionRules } from './section/displayRules';
import { LegendSection } from './section/view';
import { sendUserLegendRules } from './messages';

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
  const legends = useGraphStore((state) => state.legends);
  const optimisticLegendUpdates = useGraphStore((state) => state.optimisticLegendUpdates);
  const setOptimisticLegendUpdate = useGraphStore((state) => state.setOptimisticLegendUpdate);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const builtInNodeColorsRef = useRef<Record<string, string>>({});
  const [builtInNodeColorEnabled, setBuiltInNodeColorEnabled] = useState<Record<string, boolean>>({});

  const {
    displayedEdgeLegendRules,
    displayedNodeLegendRules,
    edgeEntries,
    edgeLegendRules,
    edgeTypeIds,
    nodeEntries,
    nodeLegendRules,
    userLegendRules,
  } = useLegendPanelState({
    edgeTypes,
    legends,
    nodeColors,
    nodeTypes,
    optimisticLegendUpdates,
  });
  const displayNodeEntries = useMemo(
    () => nodeEntries
      .filter((entry) => entry.id !== 'folder')
      .map((entry) => {
        const colorEnabled = builtInNodeColorEnabled[entry.id] ?? entry.colorEnabled ?? true;
        const storedColor = builtInNodeColorsRef.current[entry.id]
          ?? (entry.color !== entry.defaultColor ? entry.color : entry.defaultColor);
        return {
          ...entry,
          color: colorEnabled ? storedColor : entry.defaultColor,
          colorEnabled,
        };
      }),
    [builtInNodeColorEnabled, nodeEntries],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-[30rem] max-w-[calc(100vw-2rem)] shadow-lg max-h-full flex flex-col overflow-hidden">
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
            builtInEntries={displayNodeEntries}
            displayRules={displayedNodeLegendRules}
            userRules={nodeLegendRules}
            legends={legends}
            target="node"
            onBuiltInColorChange={(nodeType, color) => {
              builtInNodeColorsRef.current[nodeType] = color;
              setBuiltInNodeColorEnabled((current) => ({ ...current, [nodeType]: true }));
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: { nodeType, color },
              });
            }}
            onBuiltInColorToggle={(nodeType, enabled) => {
              const entry = nodeEntries.find((candidate) => candidate.id === nodeType);
              if (!entry) {
                return;
              }
              const storedColor = builtInNodeColorsRef.current[nodeType]
                ?? (entry.color !== entry.defaultColor ? entry.color : entry.defaultColor);
              builtInNodeColorsRef.current[nodeType] = storedColor;
              setBuiltInNodeColorEnabled((current) => ({ ...current, [nodeType]: enabled }));
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: {
                  nodeType,
                  color: enabled ? storedColor : entry.defaultColor,
                },
              });
            }}
            onRulesChange={(nextSectionRules, iconImports) => {
              sendUserLegendRules(
                replaceSectionRules(userLegendRules, 'node', nextSectionRules),
                setOptimisticUserLegends,
                iconImports,
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
              sendUserLegendRules(
                upsertEdgeTypeColorRule(userLegendRules, edgeKind, color),
                setOptimisticUserLegends,
              );
            }}
            onRulesChange={(nextSectionRules, iconImports) => {
              sendUserLegendRules(
                replaceCustomEdgeRules(userLegendRules, edgeTypeIds, nextSectionRules),
                setOptimisticUserLegends,
                iconImports,
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  readLegendPanelCollapsedState,
  writeLegendPanelCollapsedState,
} from './storage';

interface LegendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function useCollapsedLegendEntries(): readonly [
  Record<string, boolean>,
  (entryId: string, collapsed: boolean) => void,
] {
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>(
    readLegendPanelCollapsedState,
  );

  const setCollapsedEntry = (entryId: string, collapsed: boolean): void => {
    setCollapsedEntries((current) => {
      const next = { ...current };
      if (collapsed) {
        next[entryId] = true;
      } else {
        delete next[entryId];
      }
      writeLegendPanelCollapsedState(next);
      return next;
    });
  };

  return [collapsedEntries, setCollapsedEntry];
}

function useDisplayNodeEntries(
  nodeEntries: ReturnType<typeof useLegendPanelState>['nodeEntries'],
): {
  builtInNodeColorsRef: React.MutableRefObject<Record<string, string>>;
  displayNodeEntries: LegendSectionProps['builtInEntries'];
  setBuiltInNodeColorEnabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
} {
  const builtInNodeColorsRef = useRef<Record<string, string>>({});
  const [builtInNodeColorEnabled, setBuiltInNodeColorEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBuiltInNodeColorEnabled((current) => syncBuiltInNodeColorOverrides(current, nodeEntries));
  }, [nodeEntries]);

  const displayNodeEntries = useMemo(
    () => buildDisplayNodeEntries(nodeEntries, builtInNodeColorEnabled, builtInNodeColorsRef.current),
    [builtInNodeColorEnabled, nodeEntries],
  );

  return {
    builtInNodeColorsRef,
    displayNodeEntries,
    setBuiltInNodeColorEnabled,
  };
}

function syncBuiltInNodeColorOverrides(
  current: Record<string, boolean>,
  nodeEntries: ReturnType<typeof useLegendPanelState>['nodeEntries'],
): Record<string, boolean> {
  const next = { ...current };
  let changed = false;

  for (const entry of nodeEntries) {
    if (next[entry.id] === entry.colorEnabled) {
      delete next[entry.id];
      changed = true;
    }
  }

  return changed ? next : current;
}

function buildDisplayNodeEntries(
  nodeEntries: ReturnType<typeof useLegendPanelState>['nodeEntries'],
  builtInNodeColorEnabled: Record<string, boolean>,
  builtInNodeColors: Record<string, string>,
): LegendSectionProps['builtInEntries'] {
  return nodeEntries
    .filter((entry) => entry.id !== 'folder')
    .map((entry) => {
      const colorEnabled = builtInNodeColorEnabled[entry.id] ?? entry.colorEnabled ?? true;
      const storedColor = builtInNodeColors[entry.id]
        ?? (entry.color !== entry.defaultColor ? entry.color : entry.defaultColor);

      return {
        ...entry,
        color: colorEnabled ? storedColor : entry.defaultColor,
        colorEnabled,
      };
    });
}

type LegendSectionProps = React.ComponentProps<typeof LegendSection>;

export default function LegendsPanel({
  isOpen,
  onClose,
}: LegendsPanelProps): React.ReactElement | null {
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const nodeColorEnabled = useGraphStore((state) => state.nodeColorEnabled);
  const nodeColors = useGraphStore((state) => state.nodeColors);
  const legends = useGraphStore((state) => state.legends);
  const optimisticLegendUpdates = useGraphStore((state) => state.optimisticLegendUpdates);
  const setOptimisticLegendUpdate = useGraphStore((state) => state.setOptimisticLegendUpdate);
  const setOptimisticLegendUpdates = useGraphStore((state) => state.setOptimisticLegendUpdates);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const [collapsedEntries, setCollapsedEntry] = useCollapsedLegendEntries();

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
    nodeColorEnabled,
    nodeColors,
    nodeTypes,
    optimisticLegendUpdates,
  });
  const {
    builtInNodeColorsRef,
    displayNodeEntries,
    setBuiltInNodeColorEnabled,
  } = useDisplayNodeEntries(nodeEntries);

  const toggleDefaultLegendVisibilityBatch = (
    legendIds: string[],
    visible: boolean,
  ): void => {
    const optimisticUpdates = Object.fromEntries(
      legendIds.map((legendId) => [legendId, { disabled: !visible }]),
    );
    const legendVisibility = Object.fromEntries(
      legendIds.map((legendId) => [legendId, visible]),
    );
    setOptimisticLegendUpdates(optimisticUpdates);
    postMessage({
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY_BATCH',
      payload: { legendVisibility },
    });
  };

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
                payload: { nodeType, color, enabled: true },
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
                  enabled,
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
            onToggleDefaultVisibilityBatch={toggleDefaultLegendVisibilityBatch}
            collapsedEntries={collapsedEntries}
            onCollapsedChange={setCollapsedEntry}
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
            onToggleDefaultVisibilityBatch={toggleDefaultLegendVisibilityBatch}
            collapsedEntries={collapsedEntries}
            onCollapsedChange={setCollapsedEntry}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

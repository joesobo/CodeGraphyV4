import React, { useMemo, useState } from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { resolveEdgeTypeColors } from '../../graphControls/edgeTypeColors';
import { Button } from '../ui/button';
import { MdiIcon } from '../icons/MdiIcon';
import { TooltipProvider } from '../ui/overlay/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { NodeTypeRows, EdgeTypeRows } from './rows';
import { type GraphScopeTab, ScopeTabButton } from './tabs';

interface GraphScopePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GraphScopePanel({
  isOpen,
  onClose,
}: GraphScopePanelProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<GraphScopeTab>('nodes');
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const nodeVisibility = useGraphStore((state) => state.nodeVisibility);
  const edgeVisibility = useGraphStore((state) => state.edgeVisibility);
  const nodeColors = useGraphStore((state) => state.nodeColors);
  const legends = useGraphStore((state) => state.legends);
  const edgeTypesAvailable = useGraphStore(
    (state) => state.graphHasIndex && state.graphIndexFreshness === 'fresh',
  );
  const edgeColors = useMemo(
    () => resolveEdgeTypeColors(edgeTypes, legends),
    [edgeTypes, legends],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-80 shadow-lg max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
          <span className="text-sm font-medium">Graph Scope</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
            <MdiIcon path={mdiClose} size={16} />
          </Button>
        </div>

        <div className="border-b px-3 py-2">
          <div className="flex rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] p-0.5">
            <ScopeTabButton active={activeTab === 'nodes'} onClick={() => setActiveTab('nodes')}>
              Node Types
            </ScopeTabButton>
            <ScopeTabButton
              active={activeTab === 'edges'}
              disabled={!edgeTypesAvailable}
              onClick={() => setActiveTab('edges')}
              title={!edgeTypesAvailable ? 'Index workspace to enable Edge Type controls' : undefined}
            >
              Edge Types
            </ScopeTabButton>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2">
            <div className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]">
              {activeTab === 'nodes' ? (
                <NodeTypeRows
                  nodeColors={nodeColors}
                  nodeTypes={nodeTypes}
                  nodeVisibility={nodeVisibility}
                />
              ) : (
                  <EdgeTypeRows
                    edgeColors={edgeColors}
                    edgeTypes={edgeTypes}
                    edgeVisibility={edgeVisibility}
                    nodeVisibility={nodeVisibility}
                  />
                )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

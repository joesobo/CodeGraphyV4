import React from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { Button } from '../ui/button';
import { MdiIcon } from '../icons/MdiIcon';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';

interface NodesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NodesPanel({
  isOpen,
  onClose,
}: NodesPanelProps): React.ReactElement | null {
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const nodeVisibility = useGraphStore((state) => state.nodeVisibility);
  const nodeColors = useGraphStore((state) => state.nodeColors);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Nodes</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-2">
          {nodeTypes.map((nodeType) => {
            const color = nodeColors[nodeType.id] ?? nodeType.defaultColor;
            const enabled = nodeVisibility[nodeType.id] ?? nodeType.defaultVisible;

            return (
              <div key={nodeType.id} className="flex items-center gap-3 py-1.5">
                <span
                  className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{nodeType.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{nodeType.id}</div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(visible) => {
                    postMessage({
                      type: 'UPDATE_NODE_VISIBILITY',
                      payload: { nodeType: nodeType.id, visible },
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

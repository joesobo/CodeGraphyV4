import React from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { Button } from '../ui/button';
import { MdiIcon } from '../icons/MdiIcon';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';

interface EdgesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EdgesPanel({
  isOpen,
  onClose,
}: EdgesPanelProps): React.ReactElement | null {
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const edgeVisibility = useGraphStore((state) => state.edgeVisibility);
  const edgeColors = useGraphStore((state) => state.edgeColors);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Edges</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-2">
          {edgeTypes.map((edgeType) => {
            const color = edgeColors[edgeType.id] ?? edgeType.defaultColor;
            const enabled = edgeVisibility[edgeType.id] ?? edgeType.defaultVisible;

            return (
              <div key={edgeType.id} className="flex items-center gap-3 py-1.5">
                <span
                  className="h-[3px] w-4 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{edgeType.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{edgeType.id}</div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(visible) => {
                    postMessage({
                      type: 'UPDATE_EDGE_VISIBILITY',
                      payload: { edgeKind: edgeType.id, visible },
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

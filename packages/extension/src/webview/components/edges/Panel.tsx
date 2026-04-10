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

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-2">
          <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
            {edgeTypes.map((edgeType) => {
              const color = edgeColors[edgeType.id] ?? edgeType.defaultColor;
              const enabled = edgeVisibility[edgeType.id] ?? edgeType.defaultVisible;

              return (
                <div
                  key={edgeType.id}
                  className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{edgeType.label}</div>
                  </div>
                  <span
                    className="h-5 w-8 shrink-0 rounded-sm border border-black/10"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
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
        </div>
      </ScrollArea>
    </div>
  );
}

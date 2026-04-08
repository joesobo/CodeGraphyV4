import React from 'react';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { GroupsSection } from '../settingsPanel/groups/Section';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

function LegendColorSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: Array<{ id: string; label: string; color: string }>;
  onChange: (id: string, color: string) => void;
}): React.ReactElement | null {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{entry.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{entry.id}</div>
            </div>
            <label className="flex items-center gap-2">
              <input
                aria-label={`${entry.label} color`}
                type="color"
                value={entry.color}
                onChange={(event) => onChange(entry.id, event.target.value)}
                className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="w-16 text-[10px] font-mono text-muted-foreground uppercase">
                {entry.color}
              </span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

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

  if (!isOpen) {
    return null;
  }

  const nodeEntries = nodeTypes.map((nodeType) => ({
    id: nodeType.id,
    label: nodeType.label,
    color: nodeColors[nodeType.id] ?? nodeType.defaultColor,
  }));
  const edgeEntries = edgeTypes.map((edgeType) => ({
    id: edgeType.id,
    label: edgeType.label,
    color: edgeColors[edgeType.id] ?? edgeType.defaultColor,
  }));

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
          <LegendColorSection
            title="Nodes"
            entries={nodeEntries}
            onChange={(nodeType, color) => {
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: { nodeType, color },
              });
            }}
          />
          <LegendColorSection
            title="Edges"
            entries={edgeEntries}
            onChange={(edgeKind, color) => {
              postMessage({
                type: 'UPDATE_EDGE_COLOR',
                payload: { edgeKind, color },
              });
            }}
          />
          <GroupsSection />
        </div>
      </ScrollArea>
    </div>
  );
}

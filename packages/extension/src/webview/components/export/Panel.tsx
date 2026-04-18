import React from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  buildPluginExporterGroups,
} from './model';
import {
  buildGraphItems,
  buildImageItems,
} from './actions';
import {
  ExportSection,
  PluginExportSection,
} from './sections';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportPanel({
  isOpen,
  onClose,
}: ExportPanelProps): React.ReactElement | null {
  const pluginExporters = useGraphStore(s => s.pluginExporters);
  const pluginExporterGroups = buildPluginExporterGroups(pluginExporters);

  if (!isOpen) {
    return null;
  }

  const imageItems = buildImageItems();
  const graphItems = buildGraphItems();

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Export</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 px-3 pb-3 pt-2">
          <ExportSection title="Images" items={imageItems} />
          <ExportSection title="Graph" items={graphItems} />
          <PluginExportSection groups={pluginExporterGroups} />
        </div>
      </ScrollArea>
    </div>
  );
}

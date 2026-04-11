import React from 'react';
import { mdiClose } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  buildPluginExporterGroups,
  getPluginExporterKey,
} from './model';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportActionItem {
  id: string;
  label: string;
  onSelect: () => void;
}

function ExportSection({
  title,
  items,
}: {
  title: string;
  items: ExportActionItem[];
}): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-accent/20"
            onClick={item.onSelect}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
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

  const imageItems: ExportActionItem[] = [
    {
      id: 'image:png',
      label: 'Export as PNG',
      onSelect: () => window.postMessage({ type: 'REQUEST_EXPORT_PNG' }, '*'),
    },
    {
      id: 'image:svg',
      label: 'Export as SVG',
      onSelect: () => window.postMessage({ type: 'REQUEST_EXPORT_SVG' }, '*'),
    },
    {
      id: 'image:jpeg',
      label: 'Export as JPEG',
      onSelect: () => window.postMessage({ type: 'REQUEST_EXPORT_JPEG' }, '*'),
    },
  ];
  const graphItems: ExportActionItem[] = [
    {
      id: 'graph:json',
      label: 'Export as JSON',
      onSelect: () => window.postMessage({ type: 'REQUEST_EXPORT_JSON' }, '*'),
    },
    {
      id: 'graph:markdown',
      label: 'Export as Markdown',
      onSelect: () => window.postMessage({ type: 'REQUEST_EXPORT_MD' }, '*'),
    },
    {
      id: 'graph:symbols',
      label: 'Export Symbols as JSON',
      onSelect: () => postMessage({ type: 'EXPORT_SYMBOLS_JSON' }),
    },
  ];

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
          {pluginExporterGroups.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Plugins
              </h3>
              <div className="space-y-3">
                {pluginExporterGroups.map(group => (
                  <div key={group.key} className="space-y-2">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
                      {group.items.map(item => (
                        <button
                          key={getPluginExporterKey(item)}
                          type="button"
                          className="flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-accent/20"
                          onClick={() => postMessage({
                            type: 'RUN_PLUGIN_EXPORT',
                            payload: {
                              pluginId: item.pluginId,
                              index: item.index,
                            },
                          })}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

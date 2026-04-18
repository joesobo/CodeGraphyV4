import React, { useState } from 'react';
import { postMessage } from '../../vscodeApi';
import { graphStore, useGraphStore } from '../../store/state';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
  getPluginsPanelItemClassName,
  reorderPluginStatuses,
} from './model';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PluginsPanel({ isOpen, onClose }: PluginsPanelProps): React.ReactElement | null {
  const plugins = useGraphStore(s => s.pluginStatuses);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    graphStore.setState((state) => ({
      pluginStatuses: state.pluginStatuses.map((plugin) =>
        plugin.id === pluginId ? { ...plugin, enabled } : plugin
      ),
    }));
    postMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId, enabled } });
  };

  const handleDropPlugin = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (dragIndex === null) {
      setDragOverIndex(null);
      return;
    }

    const reordered = reorderPluginStatuses(plugins, dragIndex, targetIndex);
    postMessage({
      type: 'UPDATE_PLUGIN_ORDER',
      payload: { pluginIds: reordered.map(plugin => plugin.id) },
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-medium">Plugins</div>
          <div className="text-[10px] text-muted-foreground">
            Bottom runs first. Top wins.
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      {/* Scrollable plugin list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 pt-2">
          {plugins.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No plugins registered.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
              {plugins.map((plugin, index) => {
                return (
                  <div
                    key={plugin.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverIndex(index);
                    }}
                    onDrop={(event) => handleDropPlugin(event, index)}
                    onDragEnd={handleDragEnd}
                    className={getPluginsPanelItemClassName(
                      plugin.enabled,
                      index,
                      dragIndex,
                      dragOverIndex,
                    )}
                  >
                    <div className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/20">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{plugin.name}</span>
                      </div>
                      <Switch
                        checked={plugin.enabled}
                        onCheckedChange={(val) => handleTogglePlugin(plugin.id, val)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

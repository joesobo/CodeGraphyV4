import React, { useMemo, useState } from 'react';
import { postMessage } from '../../vscodeApi';
import { graphStore, useGraphStore } from '../../store/state';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
  getPluginsPanelItemClassName,
  getPluginStatusLabel,
  reorderPluginStatuses,
} from './model';
import type { IPluginStatus } from '../../../shared/plugins/status';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function setPluginEnabled(pluginId: string, enabled: boolean): void {
  graphStore.setState((state) => ({
    pluginStatuses: state.pluginStatuses.map((plugin) =>
      plugin.id === pluginId ? { ...plugin, enabled } : plugin
    ),
  }));
}

function postPluginToggle(pluginId: string, packageName: string, enabled: boolean): void {
  postMessage({
    type: 'TOGGLE_PLUGIN',
    payload: {
      pluginId,
      packageName,
      enabled,
    },
  });
}

function getEnabledPluginPackageNames(plugins: readonly IPluginStatus[]): string[] {
  return plugins
    .filter(plugin => plugin.enabled && plugin.packageName)
    .map(plugin => plugin.packageName as string);
}

interface PluginRowProps {
  dragIndex: number | null;
  dragOverIndex: number | null;
  index: number;
  plugin: IPluginStatus;
  onDragEnd(this: void): void;
  onDragOver(this: void, index: number): void;
  onDragStart(this: void, index: number): void;
  onDrop(this: void, event: React.DragEvent<HTMLDivElement>, index: number): void;
  onTogglePlugin(this: void, pluginId: string, packageName: string | undefined, enabled: boolean): void;
}

function PluginRow({
  dragIndex,
  dragOverIndex,
  index,
  plugin,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onTogglePlugin,
}: PluginRowProps): React.ReactElement {
  const statusLabel = getPluginStatusLabel(plugin);

  return (
    <div
      draggable={Boolean(plugin.packageName && plugin.enabled)}
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDrop={(event) => onDrop(event, index)}
      onDragEnd={onDragEnd}
      className={getPluginsPanelItemClassName(
        plugin.enabled,
        index,
        dragIndex,
        dragOverIndex,
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--cg-accent-subtle)]">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{plugin.name}</span>
          {statusLabel && (
            <span className="block truncate text-[10px] text-muted-foreground">
              {statusLabel}
            </span>
          )}
        </div>
        <Switch
          checked={plugin.enabled}
          disabled={!plugin.packageName}
          onCheckedChange={(val) => onTogglePlugin(plugin.id, plugin.packageName, val)}
        />
      </div>
    </div>
  );
}

interface PluginListProps {
  dragIndex: number | null;
  dragOverIndex: number | null;
  plugins: readonly IPluginStatus[];
  onDragEnd(this: void): void;
  onDragOver(this: void, index: number): void;
  onDragStart(this: void, index: number): void;
  onDrop(this: void, event: React.DragEvent<HTMLDivElement>, index: number): void;
  onTogglePlugin(this: void, pluginId: string, packageName: string | undefined, enabled: boolean): void;
}

function PluginList({
  dragIndex,
  dragOverIndex,
  plugins,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onTogglePlugin,
}: PluginListProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]">
      {plugins.map((plugin, index) => (
        <PluginRow
          key={plugin.id}
          dragIndex={dragIndex}
          dragOverIndex={dragOverIndex}
          index={index}
          plugin={plugin}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onTogglePlugin={onTogglePlugin}
        />
      ))}
    </div>
  );
}

export default function PluginsPanel({ isOpen, onClose }: PluginsPanelProps): React.ReactElement | null {
  const pluginStatuses = useGraphStore(s => s.pluginStatuses);
  const plugins = useMemo(
    () => pluginStatuses.filter(plugin => plugin.packageName),
    [pluginStatuses],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleTogglePlugin = (pluginId: string, packageName: string | undefined, enabled: boolean) => {
    if (!packageName) {
      return;
    }

    setPluginEnabled(pluginId, enabled);
    postPluginToggle(pluginId, packageName, enabled);
  };

  const handleDropPlugin = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (dragIndex === null) {
      setDragOverIndex(null);
      return;
    }

    const reordered = reorderPluginStatuses(plugins, dragIndex, targetIndex);
    const packageNames = getEnabledPluginPackageNames(reordered);
    postMessage({
      type: 'UPDATE_PLUGIN_PACKAGE_ORDER',
      payload: { packageNames },
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
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
            <PluginList
              dragIndex={dragIndex}
              dragOverIndex={dragOverIndex}
              plugins={plugins}
              onDragEnd={handleDragEnd}
              onDragOver={setDragOverIndex}
              onDragStart={setDragIndex}
              onDrop={handleDropPlugin}
              onTogglePlugin={handleTogglePlugin}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

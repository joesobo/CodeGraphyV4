import React, { useMemo } from 'react';
import { postMessage } from '../../vscodeApi';
import { graphStore, useGraphStore } from '../../store/state';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
  getPluginsPanelItemClassName,
} from './model';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { dedupePluginStatuses } from './rows';

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

function postPluginToggle(pluginId: string, enabled: boolean): void {
  postMessage({
    type: 'TOGGLE_PLUGIN',
    payload: {
      pluginId,
      enabled,
    },
  });
}

interface PluginRowProps {
  plugin: IPluginStatus;
  onTogglePlugin(this: void, pluginId: string, enabled: boolean): void;
}

function PluginRow({
  plugin,
  onTogglePlugin,
}: PluginRowProps): React.ReactElement {
  return (
    <div
      className={getPluginsPanelItemClassName(plugin.enabled)}
      data-codegraphy-row="plugin"
      data-testid="plugin-row"
    >
      <div className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--cg-accent-subtle)]">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{plugin.name}</span>
        </div>
        <Switch
          aria-label={plugin.name}
          checked={plugin.enabled}
          disabled={!plugin.packageName}
          onCheckedChange={(val) => onTogglePlugin(plugin.id, val)}
        />
      </div>
    </div>
  );
}

interface PluginListProps {
  plugins: readonly IPluginStatus[];
  onTogglePlugin(this: void, pluginId: string, enabled: boolean): void;
}

function PluginList({
  plugins,
  onTogglePlugin,
}: PluginListProps): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] divide-y divide-[var(--cg-divider-subtle)]"
      data-codegraphy-list="plugins"
    >
      {plugins.map((plugin) => (
        <PluginRow
          key={plugin.id}
          plugin={plugin}
          onTogglePlugin={onTogglePlugin}
        />
      ))}
    </div>
  );
}

export default function PluginsPanel({ isOpen, onClose }: PluginsPanelProps): React.ReactElement | null {
  const pluginStatuses = useGraphStore(s => s.pluginStatuses);
  const plugins = useMemo(
    () => dedupePluginStatuses(pluginStatuses.filter(plugin => plugin.packageName)),
    [pluginStatuses],
  );

  if (!isOpen) return null;

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    setPluginEnabled(pluginId, enabled);
    postPluginToggle(pluginId, enabled);
  };

  return (
    <section
      className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden"
      data-codegraphy-panel="plugins"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" data-codegraphy-region="panel-header">
        <div className="min-w-0">
          <div className="text-sm font-medium">Plugins</div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </header>

      {/* Scrollable plugin list */}
      <ScrollArea className="flex-1 min-h-0" data-codegraphy-region="panel-body">
        <div className="px-3 pb-3 pt-2">
          {plugins.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No plugins registered.</p>
          ) : (
            <PluginList
              plugins={plugins}
              onTogglePlugin={handleTogglePlugin}
            />
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

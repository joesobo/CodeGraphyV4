import React from 'react';
import { mdiExport } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/menus/dropdown-menu';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

export interface PluginExporterLike {
  id: string;
  label: string;
  pluginId: string;
  pluginName: string;
  index: number;
  group?: string;
}

export interface PluginExporterGroup {
  key: string;
  label: string;
  items: PluginExporterLike[];
}

export function getPluginExporterKey(item: PluginExporterLike): string {
  return `${item.pluginId}:${item.id}:${item.index}`;
}

export function buildPluginExporterGroups(
  pluginExporters: PluginExporterLike[],
): PluginExporterGroup[] {
  const groupsByLabel = new Map<string, PluginExporterGroup>();

  for (const exporter of pluginExporters) {
    const label = exporter.group
      ? `${exporter.pluginName} / ${exporter.group}`
      : exporter.pluginName;
    const existing = groupsByLabel.get(label);
    if (existing) {
      existing.items.push(exporter);
      continue;
    }

    groupsByLabel.set(label, {
      key: label,
      label,
      items: [exporter],
    });
  }

  return [...groupsByLabel.values()];
}

export function ToolbarExportMenu(): React.ReactElement {
  const pluginExporters = useGraphStore(s => s.pluginExporters);
  const pluginExporterGroups = buildPluginExporterGroups(pluginExporters);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent" title="Export">
              <MdiIcon path={mdiExport} size={16} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Export</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuLabel>Images</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_PNG' }, '*')}>
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_SVG' }, '*')}>
          Export as SVG
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JPEG' }, '*')}>
          Export as JPEG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Connections</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JSON' }, '*')}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_MD' }, '*')}>
          Export as Markdown
        </DropdownMenuItem>
        {pluginExporterGroups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Plugins</DropdownMenuLabel>
            {pluginExporterGroups.map(group => (
              <React.Fragment key={group.key}>
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.items.map(item => (
                  <DropdownMenuItem
                    key={getPluginExporterKey(item)}
                    onSelect={() => postMessage({
                      type: 'RUN_PLUGIN_EXPORT',
                      payload: {
                        pluginId: item.pluginId,
                        index: item.index,
                      },
                    })}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </React.Fragment>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * @fileoverview Right-side toolbar action buttons.
 * Provides refresh, export dropdown, plugins, and settings buttons.
 * @module webview/components/toolbar/Actions
 */

import React from 'react';
import {
  mdiAutorenew,
  mdiCogOutline,
  mdiFormatColorFill,
  mdiLinkVariant,
  mdiPuzzleOutline,
} from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../ui/menus/dropdown-menu';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { ToolbarExportMenu } from './exportMenu';

export interface ToolbarActionItemLike {
  id: string;
  label: string;
  index: number;
}

export interface ToolbarActionLike {
  id: string;
  label: string;
  icon?: string;
  pluginId: string;
  pluginName: string;
  index: number;
  items: ToolbarActionItemLike[];
}

export function getToolbarActionKey(action: ToolbarActionLike): string {
  return `${action.pluginId}:${action.id}:${action.index}`;
}

export function getToolbarActionItemKey(
  action: ToolbarActionLike,
  item: ToolbarActionItemLike,
): string {
  return `${action.pluginId}:${action.id}:${item.index}`;
}

export function getToolbarActionIconPath(action: { icon?: string }): string {
  return action.icon ?? mdiLinkVariant;
}

export function ToolbarActions(): React.ReactElement {
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const pluginToolbarActions = useGraphStore(s => s.pluginToolbarActions);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const isIndexing = useGraphStore(s => s.isIndexing);
  const refreshTitle = graphHasIndex ? 'Refresh Graph' : 'Index Repo';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
            title={refreshTitle}
            disabled={isIndexing}
          >
            <MdiIcon path={mdiAutorenew} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{refreshTitle}</TooltipContent>
      </Tooltip>

      {pluginToolbarActions.map(action => (
        <DropdownMenu key={getToolbarActionKey(action)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  title={action.label}
                >
                  <MdiIcon path={getToolbarActionIconPath(action)} size={16} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{action.label}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuLabel>{action.label}</DropdownMenuLabel>
            {action.items.map(item => (
              <DropdownMenuItem
                key={getToolbarActionItemKey(action, item)}
                onSelect={() => window.postMessage({
                  type: 'RUN_PLUGIN_TOOLBAR_ACTION',
                  payload: {
                    pluginId: action.pluginId,
                    index: action.index,
                    itemIndex: item.index,
                  },
                }, '*')}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      <ToolbarExportMenu />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => setActivePanel('legends')}
            title="Legends"
          >
            <MdiIcon path={mdiFormatColorFill} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Legends</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => setActivePanel('plugins')}
            title="Plugins"
          >
            <MdiIcon path={mdiPuzzleOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Plugins</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => setActivePanel('settings')}
            title="Settings"
          >
            <MdiIcon path={mdiCogOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}

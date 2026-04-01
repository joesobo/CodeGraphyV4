/**
 * @fileoverview Right-side toolbar action buttons.
 * Provides refresh, export dropdown, plugins, and settings buttons.
 * @module webview/components/toolbar/Actions
 */

import React from 'react';
import { mdiAutorenew, mdiPuzzleOutline, mdiCogOutline, mdiExport } from '@mdi/js';
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

export function ToolbarActions(): React.ReactElement {
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
            title="Refresh Graph"
          >
            <MdiIcon path={mdiAutorenew} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Refresh Graph</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-transparent"
                title="Export"
              >
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
        </DropdownMenuContent>
      </DropdownMenu>

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

import React from 'react';
import {
  mdiGraphOutline,
  mdiBullseye,
  mdiFolderOutline,
  mdiRefresh,
  mdiPuzzleOutline,
  mdiCogOutline,
  mdiCircleOutline,
  mdiSphere,
  mdiExport,
} from '@mdi/js';
import { MdiIcon, DagDefaultIcon, DagRadialIcon, DagTopDownIcon, DagLeftRightIcon } from './icons';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { useGraphStore } from '../store';
import { postMessage } from '../lib/vscodeApi';
import type { DagMode } from '../../shared/types';

const VIEW_ICONS: Record<string, string> = {
  'codegraphy.connections': mdiGraphOutline,
  'codegraphy.depth-graph': mdiBullseye,
  'codegraphy.folder': mdiFolderOutline,
};

const DAG_MODES: { mode: DagMode; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { mode: null, label: 'Default', Icon: DagDefaultIcon },
  { mode: 'radialout', label: 'Radial Out', Icon: DagRadialIcon },
  { mode: 'td', label: 'Top Down', Icon: DagTopDownIcon },
  { mode: 'lr', label: 'Left to Right', Icon: DagLeftRightIcon },
];

export default function Toolbar(): React.ReactElement {
  const availableViews = useGraphStore(s => s.availableViews);
  const activeViewId = useGraphStore(s => s.activeViewId);
  const dagMode = useGraphStore(s => s.dagMode);
  const graphMode = useGraphStore(s => s.graphMode);
  const setGraphMode = useGraphStore(s => s.setGraphMode);
  const depthLimit = useGraphStore(s => s.depthLimit);
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  const handleViewChange = (viewId: string) => {
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  };

  const handleDagModeChange = (mode: DagMode) => {
    postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: mode } });
  };

  const handleDepthChange = (value: number[]) => {
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: value[0] } });
  };

  const isDepthView = activeViewId === 'codegraphy.depth-graph';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5">
        {/* Depth slider — animated, only visible when Depth view active */}
        <div
          className="flex items-center gap-1 overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxWidth: isDepthView ? '8rem' : '0px',
            opacity: isDepthView ? 1 : 0,
          }}
        >
          <span className="text-xs text-muted-foreground whitespace-nowrap">{depthLimit}</span>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[depthLimit]}
            onValueChange={handleDepthChange}
            className="w-16"
          />
        </div>

        {availableViews.length > 0 && (
          <div className="flex items-center bg-popover/80 backdrop-blur-sm rounded-md border border-border">
            {availableViews.map(view => {
              const iconPath = VIEW_ICONS[view.id];
              return (
                <Tooltip key={view.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeViewId === view.id ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleViewChange(view.id)}
                    >
                      {iconPath ? (
                        <MdiIcon path={iconPath} size={16} />
                      ) : (
                        <span className="text-xs">{view.name[0]}</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{view.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        <div className="flex items-center bg-popover/80 backdrop-blur-sm rounded-md border border-border">
          {DAG_MODES.map(({ mode, label, Icon }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant={dagMode === mode ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDagModeChange(mode)}
                >
                  <Icon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => setGraphMode(graphMode === '2d' ? '3d' : '2d')}
            >
              <MdiIcon path={graphMode === '2d' ? mdiCircleOutline : mdiSphere} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{graphMode === '2d' ? '2D Mode' : '3D Mode'}</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
              title="Reset Graph"
            >
              <MdiIcon path={mdiRefresh} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset Graph</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
                  title="Export"
                >
                  <MdiIcon path={mdiExport} size={16} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Export</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top">
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
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => setActivePanel('plugins')}
              title="Plugins"
            >
              <MdiIcon path={mdiPuzzleOutline} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Plugins</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => setActivePanel('settings')}
              title="Settings"
            >
              <MdiIcon path={mdiCogOutline} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

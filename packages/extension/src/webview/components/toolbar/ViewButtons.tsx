/**
 * @fileoverview View switcher buttons and depth slider.
 * Renders icon buttons for each available graph view and an animated depth slider.
 * @module webview/components/toolbar/ViewButtons
 */

import React from 'react';
import { mdiGraphOutline, mdiBullseye, mdiFolderOutline } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Slider } from '../ui/controls/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

const VIEW_ICONS: Record<string, string> = {
  'codegraphy.connections': mdiGraphOutline,
  'codegraphy.depth-graph': mdiBullseye,
  'codegraphy.folder': mdiFolderOutline,
};

export function ViewButtons(): React.ReactElement {
  const availableViews = useGraphStore(s => s.availableViews);
  const activeViewId = useGraphStore(s => s.activeViewId);
  const depthLimit = useGraphStore(s => s.depthLimit);

  const isDepthView = activeViewId === 'codegraphy.depth-graph';

  const handleViewChange = (viewId: string) => {
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  };

  const handleDepthChange = (value: number[]) => {
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: value[0] } });
  };

  return (
    <>
      {isDepthView && (
        <div
          className="flex items-center gap-1 overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxWidth: '8rem',
            opacity: 1,
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
      )}

      {availableViews.length > 0 && (
        <div data-testid="view-buttons" className="flex flex-col items-center gap-1">
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
                <TooltipContent side="right">{view.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </>
  );
}

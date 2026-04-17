/**
 * @fileoverview Rich tooltip component for graph nodes.
 * Uses Floating UI to position relative to the node's screen bounding circle,
 * with automatic flip/shift for viewport edges.
 */

import React, { useEffect, useMemo } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { cn } from '../ui/cn';
import { Separator } from '../ui/separator';
import { TooltipHeader, TooltipStats, TooltipExtraSections } from './content';
import type { TooltipAction } from '../../pluginHost/api/contracts';
import type { WebviewPluginHost } from '../../pluginHost/manager';
import { SlotHost } from '../../pluginHost/slotHost/view';

interface NodeTooltipProps {
  /** File path relative to workspace */
  path: string;
  /** File size in bytes */
  size?: number;
  /** Last modified timestamp (ms since epoch) */
  lastModified?: number;
  /** Number of incoming connections */
  incomingCount: number;
  /** Number of outgoing connections */
  outgoingCount: number;
  /** Plugin that handles this file */
  plugin?: string;
  /** Number of times this file has been visited/opened */
  visits?: number;
  /** Node bounding circle in screen coordinates */
  nodeRect: { x: number; y: number; radius: number };
  /** Whether tooltip is visible */
  visible: boolean;
  /** Optional plugin-contributed sections */
  extraActions?: TooltipAction[];
  /** Optional plugin-contributed sections */
  extraSections?: Array<{ title: string; content: string }>;
  /** Optional plugin host for mounted tooltip slot content */
  pluginHost?: WebviewPluginHost;
}

export function NodeTooltip({
  path,
  size,
  lastModified,
  incomingCount,
  outgoingCount,
  plugin,
  visits,
  nodeRect,
  visible,
  extraActions = [],
  extraSections = [],
  pluginHost,
}: NodeTooltipProps): React.ReactElement | null {
  // Virtual element representing the node's bounding circle as a rect
  const virtualEl = useMemo(() => {
    const r = nodeRect.radius;
    return {
      getBoundingClientRect: () => ({
        x: nodeRect.x - r,
        y: nodeRect.y - r,
        width: r * 2,
        height: r * 2,
        top: nodeRect.y - r,
        left: nodeRect.x - r,
        right: nodeRect.x + r,
        bottom: nodeRect.y + r,
      }),
    };
  }, [nodeRect.x, nodeRect.y, nodeRect.radius]);

  const { refs, floatingStyles } = useFloating({
    open: visible,
    placement: 'right-start',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['left-start', 'right-end', 'left-end'] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Update the virtual reference whenever node position/size changes
  useEffect(() => {
    refs.setReference(virtualEl);
  }, [refs, virtualEl]);

  if (!visible) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 1000, maxWidth: 280 }}
      className={cn(
        'rounded-md border shadow-md pointer-events-none',
        'bg-[var(--vscode-editorHoverWidget-background,#252526)]',
        'border-[var(--vscode-editorHoverWidget-border,#454545)]',
        'text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]',
      )}
    >
      <TooltipHeader path={path} />

      <Separator className="bg-[var(--vscode-editorHoverWidget-border,#454545)]" />

      <TooltipStats
        outgoingCount={outgoingCount}
        incomingCount={incomingCount}
        size={size}
        lastModified={lastModified}
        visits={visits}
        plugin={plugin}
      />

      <TooltipExtraSections actions={extraActions} sections={extraSections} />

      {pluginHost ? (
        <>
          <Separator className="bg-[var(--vscode-editorHoverWidget-border,#454545)]" />
          <SlotHost
            pluginHost={pluginHost}
            slot="tooltip"
            data-testid="tooltip-plugin-slot"
            className="px-3 py-1.5 space-y-1 pointer-events-auto"
          />
        </>
      ) : null}
    </div>
  );
}

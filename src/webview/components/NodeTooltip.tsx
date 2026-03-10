/**
 * @fileoverview Rich tooltip component for graph nodes.
 * Uses Floating UI to position relative to a virtual anchor at the node's
 * screen coordinates, with automatic flip/shift for viewport edges.
 */

import React, { useEffect, useMemo } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { cn } from '../lib/utils';
import { Separator } from './ui/separator';

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
  /** Position to show tooltip (screen coordinates of node edge) */
  position: { x: number; y: number };
  /** Whether tooltip is visible */
  visible: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export function NodeTooltip({
  path,
  size,
  lastModified,
  incomingCount,
  outgoingCount,
  plugin,
  visits,
  position,
  visible,
}: NodeTooltipProps): React.ReactElement | null {
  // Virtual element anchored at the node's screen position
  const virtualEl = useMemo(() => ({
    getBoundingClientRect: () => ({
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
      top: position.y,
      left: position.x,
      right: position.x,
      bottom: position.y,
    }),
  }), [position.x, position.y]);

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

  // Update the virtual reference whenever position changes
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
        'animate-in fade-in-0 zoom-in-95 duration-100'
      )}
    >
      {/* Header — file path */}
      <div className="px-3 pt-2 pb-1.5">
        <p className="text-xs font-semibold text-[var(--vscode-textLink-foreground,#3794ff)] break-all leading-snug">
          {path}
        </p>
      </div>

      <Separator className="bg-[var(--vscode-editorHoverWidget-border,#454545)]" />

      {/* Stats */}
      <div className="px-3 py-1.5 space-y-0.5 text-[11px] font-mono">
        <Row label="Connections" value={`${outgoingCount} out \u00B7 ${incomingCount} in`} />
        {size !== undefined && <Row label="Size" value={formatSize(size)} />}
        {lastModified !== undefined && <Row label="Modified" value={formatRelativeTime(lastModified)} />}
        {(visits ?? 0) > 0 && <Row label="Visits" value={String(visits)} />}
        {plugin && <Row label="Plugin" value={plugin} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--vscode-descriptionForeground,#8c8c8c)]">{label}</span>
      <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)] text-right">{value}</span>
    </div>
  );
}

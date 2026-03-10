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
  /** Node bounding circle in screen coordinates */
  nodeRect: { x: number; y: number; radius: number };
  /** Whether tooltip is visible */
  visible: boolean;
  /** Optional plugin-contributed sections */
  extraSections?: Array<{ title: string; content: string }>;
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
  nodeRect,
  visible,
  extraSections = [],
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

      {extraSections.length > 0 && (
        <>
          <Separator className="bg-[var(--vscode-editorHoverWidget-border,#454545)]" />
          <div className="px-3 py-1.5 space-y-1 text-[11px]">
            {extraSections.map((section, index) => (
              <div key={`${section.title}-${index}`}>
                <p className="font-semibold text-[var(--vscode-textLink-foreground,#3794ff)]">
                  {section.title}
                </p>
                <p className="font-mono whitespace-pre-wrap break-words">{section.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
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

/**
 * @fileoverview Rich tooltip component for graph nodes.
 * Positioned relative to the hovered node's screen coordinates.
 */

import React, { useRef } from 'react';
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
  /** Position to show tooltip (screen coordinates) */
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
  const ref = useRef<HTMLDivElement>(null);

  if (!visible) return null;

  const maxWidth = 280;
  const offset = 12;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Use measured dimensions when available, fall back to estimates
  const actualW = ref.current?.offsetWidth ?? maxWidth;
  const actualH = ref.current?.offsetHeight ?? 160;

  // Position to the right of the node by default, flip if it would overflow
  let left = position.x + offset;
  let top = position.y + offset;

  if (left + actualW > viewportWidth - offset) {
    left = position.x - actualW - offset;
  }
  if (top + actualH > viewportHeight - offset) {
    top = position.y - actualH - offset;
  }

  left = Math.max(offset, left);
  top = Math.max(offset, top);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 1000, maxWidth }}
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

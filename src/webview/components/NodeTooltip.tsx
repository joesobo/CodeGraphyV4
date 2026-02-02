/**
 * @fileoverview Rich tooltip component for graph nodes.
 * Shows file information on hover.
 */

import React from 'react';
import { cn } from '../lib/utils';

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
  /** Position to show tooltip */
  position: { x: number; y: number };
  /** Whether tooltip is visible */
  visible: boolean;
}

/**
 * Format file size to human readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format timestamp to relative time string
 */
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

/**
 * Rich tooltip showing file information.
 */
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
  if (!visible) return null;

  // Tooltip dimensions (approximate, actual size may vary)
  const tooltipWidth = 300;
  const tooltipHeight = 150;
  const padding = 10;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate position, keeping tooltip within viewport
  let left = position.x + padding;
  let top = position.y + padding;

  // Check right edge - if tooltip would overflow, position to left of cursor
  if (left + tooltipWidth > viewportWidth - padding) {
    left = position.x - tooltipWidth - padding;
  }

  // Check bottom edge - if tooltip would overflow, position above cursor
  if (top + tooltipHeight > viewportHeight - padding) {
    top = position.y - tooltipHeight - padding;
  }

  // Ensure tooltip doesn't go off left or top edges
  left = Math.max(padding, left);
  top = Math.max(padding, top);

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
    zIndex: 1000,
    maxWidth: tooltipWidth,
  };

  return (
    <div
      style={tooltipStyle}
      className={cn(
        'px-3 py-2 rounded-md shadow-lg',
        'bg-[var(--vscode-editorHoverWidget-background,#252526)]',
        'border border-[var(--vscode-editorHoverWidget-border,#454545)]',
        'text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]',
        'text-xs font-mono',
        'animate-in fade-in-0 zoom-in-95 duration-100'
      )}
    >
      {/* File path */}
      <div className="font-semibold text-[var(--vscode-textLink-foreground,#3794ff)] mb-1 break-all">
        {path}
      </div>

      {/* Stats */}
      <div className="space-y-0.5 text-[var(--vscode-descriptionForeground,#8c8c8c)]">
        {/* Size */}
        {size !== undefined && (
          <div className="flex justify-between gap-4">
            <span>Size:</span>
            <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]">
              {formatSize(size)}
            </span>
          </div>
        )}

        {/* Last modified */}
        {lastModified !== undefined && (
          <div className="flex justify-between gap-4">
            <span>Modified:</span>
            <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]">
              {formatRelativeTime(lastModified)}
            </span>
          </div>
        )}

        {/* Connections */}
        <div className="flex justify-between gap-4">
          <span>Connections:</span>
          <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]">
            {outgoingCount} imports • {incomingCount} imported by
          </span>
        </div>

        {/* Visits */}
        <div className="flex justify-between gap-4">
          <span>Visits:</span>
          <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]">
            {visits ?? 0}
          </span>
        </div>

        {/* Plugin */}
        {plugin && (
          <div className="flex justify-between gap-4">
            <span>Plugin:</span>
            <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)]">
              {plugin}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @fileoverview Content rendering components for the node tooltip.
 * @module webview/components/nodeTooltipContent
 */

import React from 'react';
import { Separator } from './ui/separator';
import { formatSize, formatRelativeTime } from './tooltipFormatters';

export interface TooltipContentProps {
  path: string;
  size?: number;
  lastModified?: number;
  incomingCount: number;
  outgoingCount: number;
  plugin?: string;
  visits?: number;
  extraSections?: Array<{ title: string; content: string }>;
}

export function TooltipHeader({ path }: { path: string }): React.ReactElement {
  return (
    <div className="px-3 pt-2 pb-1.5">
      <p className="text-xs font-semibold text-[var(--vscode-textLink-foreground,#3794ff)] break-all leading-snug">
        {path}
      </p>
    </div>
  );
}

export function TooltipStats({
  outgoingCount,
  incomingCount,
  size,
  lastModified,
  visits,
  plugin,
}: Omit<TooltipContentProps, 'path' | 'extraSections'>): React.ReactElement {
  return (
    <div className="px-3 py-1.5 space-y-0.5 text-[11px] font-mono">
      <Row label="Connections" value={`${outgoingCount} out \u00B7 ${incomingCount} in`} />
      {size !== undefined && <Row label="Size" value={formatSize(size)} />}
      {lastModified !== undefined && <Row label="Modified" value={formatRelativeTime(lastModified)} />}
      {(visits ?? 0) > 0 && <Row label="Visits" value={String(visits)} />}
      {plugin && <Row label="Plugin" value={plugin} />}
    </div>
  );
}

export function TooltipExtraSections({
  sections,
}: {
  sections: Array<{ title: string; content: string }>;
}): React.ReactElement | null {
  if (sections.length === 0) return null;
  return (
    <>
      <Separator className="bg-[var(--vscode-editorHoverWidget-border,#454545)]" />
      <div className="px-3 py-1.5 space-y-1 text-[11px]">
        {sections.map((section, index) => (
          <div key={`${section.title}-${index}`}>
            <p className="font-semibold text-[var(--vscode-textLink-foreground,#3794ff)]">
              {section.title}
            </p>
            <p className="font-mono whitespace-pre-wrap break-words">{section.content}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--vscode-descriptionForeground,#8c8c8c)]">{label}</span>
      <span className="text-[var(--vscode-editorHoverWidget-foreground,#cccccc)] text-right">{value}</span>
    </div>
  );
}

/**
 * @fileoverview Content rendering components for the node tooltip.
 * @module webview/components/nodeTooltipContent
 */

import React from 'react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { formatSize, formatRelativeTime } from './formatters';
import type { TooltipAction } from '../../pluginHost/api/contracts/webview';

export interface TooltipContentProps {
  path: string;
  symbol?: {
    name: string;
    kind: string;
    filePath: string;
  };
  size?: number;
  lastModified?: number;
  incomingCount: number;
  outgoingCount: number;
  plugin?: string;
  extraActions?: TooltipAction[];
  extraSections?: Array<{ title: string; content: string }>;
}

function runTooltipAction(action: TooltipAction): void {
  const report = (error: unknown): void => {
    console.error(`[CodeGraphy] Tooltip action '${action.id}' failed:`, error);
  };
  try {
    void Promise.resolve(action.action()).catch(report);
  } catch (error) {
    report(error);
  }
}

export function TooltipHeader({
  path,
  symbol,
}: {
  path: string;
  symbol?: TooltipContentProps['symbol'];
}): React.ReactElement {
  return (
    <div className="px-3 pt-2 pb-1.5">
      <p className="text-xs font-semibold text-link break-all leading-snug">
        {symbol?.name ?? path}
      </p>
      {symbol ? (
        <p className="pt-0.5 text-[11px] text-muted-foreground break-all leading-snug">
          {symbol.filePath}
        </p>
      ) : null}
    </div>
  );
}

export function TooltipStats({
  outgoingCount,
  incomingCount,
  symbol,
  size,
  lastModified,
  plugin,
}: Omit<TooltipContentProps, 'path' | 'extraSections'>): React.ReactElement {
  return (
    <div className="px-3 py-1.5 space-y-0.5 text-[11px] font-mono">
      <Row label="Connections" value={symbol ? `${incomingCount} in` : `${outgoingCount} out \u00B7 ${incomingCount} in`} />
      {symbol && <Row label="Type" value={symbol.kind} />}
      {size !== undefined && <Row label="Size" value={formatSize(size)} />}
      {lastModified !== undefined && <Row label="Modified" value={formatRelativeTime(lastModified)} />}
      {plugin && <Row label="Plugin" value={plugin} />}
    </div>
  );
}

export function TooltipExtraSections({
  actions = [],
  sections,
}: {
  actions?: TooltipAction[];
  sections: Array<{ title: string; content: string }>;
}): React.ReactElement | null {
  if (sections.length === 0 && actions.length === 0) return null;
  return (
    <>
      <Separator className="bg-border" />
      <div className="px-3 py-1.5 space-y-1 text-[11px]">
        {sections.map((section, index) => (
          <div key={`${section.title}-${index}`}>
            <p className="font-semibold text-link">
              {section.title}
            </p>
            <p className="font-mono whitespace-pre-wrap break-words">{section.content}</p>
          </div>
        ))}
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1 pointer-events-auto">
            {actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => runTooltipAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-popover-foreground text-right">{value}</span>
    </div>
  );
}

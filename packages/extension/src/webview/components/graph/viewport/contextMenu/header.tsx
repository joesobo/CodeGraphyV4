import type { ReactElement } from 'react';
import { ContextMenuLabel } from '../../../ui/context/menu';
import type { GraphContextMenuHeader } from '../../contextMenu/contracts';
import { MiddleTruncatedText } from './middleTruncation';

export function graphContextMenuAccessibleName(header: GraphContextMenuHeader): string {
  if (header.kind === 'background') return `${header.workspaceName} root`;
  if (header.kind === 'multiNode') return `${header.count} Nodes selected`;
  if (header.kind === 'node') {
    return header.target.exactId
      ? `${header.target.label}, ${header.target.exactId}`
      : header.target.label;
  }

  const source = header.source.exactId
    ? `${header.source.label}, ${header.source.exactId}`
    : header.source.label;
  const target = header.target.exactId
    ? `${header.target.label}, ${header.target.exactId}`
    : header.target.label;
  const endpoints = `${source} to ${target}`;
  return header.relationship ? `${endpoints}, ${header.relationship}` : endpoints;
}

function IdentityHeader({ header }: { header: Extract<GraphContextMenuHeader, { kind: 'node' }> }): ReactElement {
  return (
    <>
      <MiddleTruncatedText className="font-semibold text-[var(--cg-menu-foreground)]" text={header.target.label} />
      {header.target.exactId ? (
        <MiddleTruncatedText className="pt-0.5 text-[11px] font-normal text-muted-foreground" text={header.target.exactId} />
      ) : null}
    </>
  );
}

function EdgeHeader({ header }: { header: Extract<GraphContextMenuHeader, { kind: 'edge' }> }): ReactElement {
  return (
    <>
      <div className="flex min-w-0 items-center gap-1 font-semibold text-[var(--cg-menu-foreground)]">
        <MiddleTruncatedText
          className="min-w-0 max-w-[calc(50%-0.75rem)]"
          text={header.source.label}
          tooltipText={header.source.exactId ? `${header.source.label} — ${header.source.exactId}` : header.source.label}
        />
        <span aria-hidden="true" className="shrink-0">→</span>
        <MiddleTruncatedText
          className="min-w-0 max-w-[calc(50%-0.75rem)]"
          text={header.target.label}
          tooltipText={header.target.exactId ? `${header.target.label} — ${header.target.exactId}` : header.target.label}
        />
      </div>
      {header.relationship ? (
        <MiddleTruncatedText className="pt-0.5 text-[11px] font-mono font-normal text-muted-foreground" text={header.relationship} />
      ) : null}
    </>
  );
}

function BackgroundHeader({ header }: { header: Extract<GraphContextMenuHeader, { kind: 'background' }> }): ReactElement {
  return (
    <div className="flex min-w-0 items-baseline gap-1">
      <MiddleTruncatedText className="min-w-0 flex-1 font-semibold text-[var(--cg-menu-foreground)]" text={header.workspaceName} />
      <span className="shrink-0 text-[11px] font-normal text-muted-foreground">(root)</span>
    </div>
  );
}

export function ViewportContextMenuHeader({ header }: { header: GraphContextMenuHeader }): ReactElement {
  return (
    <ContextMenuLabel
      className="min-w-0 py-1.5 leading-snug"
      data-context-menu-header={header.kind}
    >
      {header.kind === 'background' ? <BackgroundHeader header={header} /> : null}
      {header.kind === 'edge' ? <EdgeHeader header={header} /> : null}
      {header.kind === 'multiNode' ? (
        <p className="font-semibold text-[var(--cg-menu-foreground)]">{header.count} Nodes selected</p>
      ) : null}
      {header.kind === 'node' ? <IdentityHeader header={header} /> : null}
    </ContextMenuLabel>
  );
}

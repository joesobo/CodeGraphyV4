import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EdgeTypeRows,
  NodeTypeRows,
  resolveScopeRowClassName,
} from '../../../src/webview/components/graphScope/rows';
import {
  flushGraphScopeVisibilityMessages,
  resetGraphScopeVisibilityMessageQueueForTests,
} from '../../../src/webview/components/graphScope/messages';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
}));

function scopeRow(container: HTMLElement, label: string): HTMLElement {
  return container.querySelector(`[data-scope-row="${label}"]`) as HTMLElement;
}

function scopeSwatch(container: HTMLElement, label: string): HTMLElement {
  return container.querySelector(`[data-scope-swatch="${label}"]`) as HTMLElement;
}

describe('graph scope rows', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    resetGraphScopeVisibilityMessageQueueForTests();
  });

  afterEach(() => {
    resetGraphScopeVisibilityMessageQueueForTests();
  });

  it('keeps disabled scope rows visibly muted without muting enabled rows', () => {
    expect(resolveScopeRowClassName(true)).toContain('hover:bg-[var(--cg-accent-subtle)]');
    expect(resolveScopeRowClassName(true)).not.toContain('opacity-65');
    expect(resolveScopeRowClassName(false)).toContain('opacity-65');
  });

  it('renders node rows from overrides and posts node visibility changes', () => {
    const { container } = render(
      <NodeTypeRows
        nodeColors={{ file: '#555555' }}
        nodeTypes={[
          { id: 'file', label: 'File', defaultColor: '#111111', defaultVisible: true },
          { id: 'folder', label: 'Folder', defaultColor: '#222222', defaultVisible: false },
        ]}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeSwatch(container, 'File')).toHaveStyle('background-color: #555555');
    expect(scopeSwatch(container, 'Folder')).toHaveStyle('background-color: #222222');
    expect(scopeRow(container, 'File')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'Folder')).not.toHaveClass('opacity-65');

    fireEvent.click(screen.getByLabelText('Toggle File'));
    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { file: false } },
    });
  });

  it('mutes node rows when visibility is explicitly disabled', () => {
    const { container } = render(
      <NodeTypeRows
        nodeColors={{}}
        nodeTypes={[
          { id: 'file', label: 'File', defaultColor: '#111111', defaultVisible: true },
        ]}
        nodeVisibility={{ file: false }}
      />,
    );

    expect(scopeRow(container, 'File')).toHaveClass('opacity-65');
  });

  it('shows and disables a node row while its evidence is hydrating', () => {
    const { container } = render(
      <NodeTypeRows
        nodeColors={{}}
        nodeTypes={[
          { id: 'symbol:function', label: 'Function', defaultColor: '#111111', defaultVisible: false },
        ]}
        nodeVisibility={{ 'symbol:function': true }}
        scopeHydrationPending={{ 'symbol:function': true }}
      />,
    );

    expect(scopeRow(container, 'Function')).toHaveAttribute('data-scope-hydrating', 'true');
    expect(screen.getByLabelText('Toggle Function')).toBeDisabled();
    expect(container.querySelector('[data-scope-hydration-indicator="Function"]')).toBeInTheDocument();
  });

  it('renders child rows even when parent categories are disabled', () => {
    const nodeTypes = [
      { id: 'symbol', label: 'Symbol', defaultColor: '#111111', defaultVisible: false },
      {
        id: 'symbol:function',
        label: 'Function',
        defaultColor: '#333333',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'variable',
        label: 'Variable',
        defaultColor: '#222222',
        defaultVisible: false,
        parentId: 'symbol',
      },
      {
        id: 'symbol:constant',
        label: 'Constant',
        defaultColor: '#444444',
        defaultVisible: true,
        parentId: 'variable',
      },
    ];
    const { container } = render(
      <NodeTypeRows
        nodeColors={{}}
        nodeTypes={nodeTypes}
        nodeVisibility={{ symbol: false, variable: false }}
      />,
    );

    expect(scopeRow(container, 'Symbol')).toBeInTheDocument();
    expect(scopeRow(container, 'Function')).toBeInTheDocument();
    expect(scopeRow(container, 'Variable')).toBeInTheDocument();
    expect(scopeRow(container, 'Constant')).toBeInTheDocument();
    expect(scopeRow(container, 'Symbol')).toHaveAttribute('data-scope-depth', '0');
    expect(scopeRow(container, 'Function')).toHaveAttribute('data-scope-depth', '1');
    expect(scopeRow(container, 'Variable')).toHaveAttribute('data-scope-depth', '1');
    expect(scopeRow(container, 'Constant')).toHaveAttribute('data-scope-depth', '2');
    expect(scopeRow(container, 'Function')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'Constant')).not.toHaveClass('opacity-65');
    expect(container.querySelector('[data-scope-swatch="Symbol"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-scope-swatch="Variable"]')).not.toBeInTheDocument();
    expect(scopeSwatch(container, 'Function')).toHaveStyle('background-color: #333333');
    expect(scopeSwatch(container, 'Constant')).toHaveStyle('background-color: #444444');
  });

  it('renders edge rows from resolved colors and posts edge visibility changes', () => {
    const { container } = render(
      <EdgeTypeRows
        edgeColors={{ import: '#abcdef' }}
        edgeTypes={[
          { id: 'import', label: 'Imports', defaultColor: '#333333', defaultVisible: true },
          { id: 'reference', label: 'References', defaultColor: '#444444', defaultVisible: true },
        ]}
        edgeVisibility={{ reference: false }}
        graphHasIndex={true}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeSwatch(container, 'Imports')).toHaveStyle('background-color: #abcdef');
    expect(scopeSwatch(container, 'References')).toHaveStyle('background-color: #444444');
    expect(scopeRow(container, 'Imports')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'References')).toHaveClass('opacity-65');

    fireEvent.click(screen.getByLabelText('Toggle References'));
    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { edgeVisibility: { reference: true } },
    });
  });

  it('shows only structural edge rows before indexing', () => {
    const { container } = render(
      <EdgeTypeRows
        edgeColors={{}}
        edgeTypes={[
          { id: 'reference', label: 'References', defaultColor: '#444444', defaultVisible: true },
          { id: 'nests', label: 'Nests', defaultColor: '#555555', defaultVisible: false },
        ]}
        edgeVisibility={{}}
        graphHasIndex={false}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeRow(container, 'References')).not.toBeInTheDocument();
    expect(scopeRow(container, 'Nests')).toBeInTheDocument();
  });

  it('hides edge rows until their prerequisite edge type is enabled', () => {
    const { container, rerender } = render(
      <EdgeTypeRows
        edgeColors={{}}
        edgeTypes={[
          { id: 'inherit', label: 'Inherits', defaultColor: '#111111', defaultVisible: false },
          {
            id: 'overrides',
            label: 'Overrides',
            defaultColor: '#222222',
            defaultVisible: false,
            requiresEdgeType: 'inherit',
          },
        ]}
        edgeVisibility={{ inherit: false }}
        graphHasIndex={true}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeRow(container, 'Inherits')).toBeInTheDocument();
    expect(scopeRow(container, 'Overrides')).not.toBeInTheDocument();

    rerender(
      <EdgeTypeRows
        edgeColors={{}}
        edgeTypes={[
          { id: 'inherit', label: 'Inherits', defaultColor: '#111111', defaultVisible: false },
          {
            id: 'overrides',
            label: 'Overrides',
            defaultColor: '#222222',
            defaultVisible: false,
            requiresEdgeType: 'inherit',
          },
        ]}
        edgeVisibility={{ inherit: true }}
        graphHasIndex={true}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeRow(container, 'Overrides')).toBeInTheDocument();

    rerender(
      <EdgeTypeRows
        edgeColors={{}}
        edgeTypes={[
          { id: 'inherit', label: 'Inherits', defaultColor: '#111111', defaultVisible: false },
          {
            id: 'overrides',
            label: 'Overrides',
            defaultColor: '#222222',
            defaultVisible: false,
            requiresEdgeType: 'inherit',
          },
        ]}
        edgeVisibility={{ inherit: false, overrides: true }}
        graphHasIndex={true}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeRow(container, 'Overrides')).toBeInTheDocument();
  });

  it('shows example tooltip text for edge rows that define examples', async () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <EdgeTypeRows
          edgeColors={{}}
          edgeTypes={[
            {
              id: 'import',
              label: 'Imports',
              defaultColor: '#333333',
              defaultVisible: true,
              description: {
                description: 'Files imported by another file.',
                examples: [{ code: 'import { thing } from "./module";' }],
              },
            },
          ]}
          edgeVisibility={{}}
          graphHasIndex={true}
          nodeVisibility={{ folder: true }}
        />
      </TooltipProvider>,
    );

    const row = scopeRow(container, 'Imports');
    fireEvent.pointerMove(row, { pointerType: 'mouse' });

    const tooltip = await screen.findByRole('tooltip');
    const visibleTooltip = document.querySelector('[data-side="left"][data-align="start"]') as HTMLElement;
    const tooltipBody = tooltip.querySelector('[data-scope-tooltip-body="Imports"]') as HTMLElement;
    const tooltipSwatch = tooltipBody.querySelector('[data-scope-tooltip-swatch="Imports"]') as HTMLElement;

    expect(tooltip).toHaveTextContent('Files imported by another file.');
    expect(row).toHaveClass('cursor-pointer');
    expect(visibleTooltip).toHaveClass('max-w-80');
    expect(tooltipBody).toHaveClass('max-w-80');
    expect(tooltipSwatch).toHaveStyle('background-color: #333333');
    expect(tooltip).not.toHaveTextContent('Example');
    expect(screen.getByRole('tooltip')).toHaveTextContent('import { thing } from "./module";');

    const example = tooltipBody.querySelector('[data-scope-tooltip-example="Imports"]') as HTMLElement;
    expect(example).toHaveClass('whitespace-pre');
    expect(example).toHaveClass('overflow-x-auto');
  });

  it('shows description-only tooltip text for node rows without examples', async () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <NodeTypeRows
          nodeColors={{}}
          nodeTypes={[
            {
              id: 'folder',
              label: 'Folder',
              defaultColor: '#222222',
              defaultVisible: false,
              description: {
                description: 'Directories that group files and other folders.',
              },
            },
          ]}
          nodeVisibility={{ folder: false }}
        />
      </TooltipProvider>,
    );

    const row = scopeRow(container, 'Folder');
    fireEvent.pointerMove(row, { pointerType: 'mouse' });

    const tooltip = await screen.findByRole('tooltip');

    expect(row).toHaveClass('cursor-pointer');
    expect(tooltip).toHaveTextContent('Folder');
    expect(tooltip).toHaveTextContent('Directories that group files and other folders.');
    expect(tooltip).not.toHaveTextContent('Example');
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EdgeTypeRows,
  NodeTypeRows,
  resolveScopeRowClassName,
} from '../../../src/webview/components/graphScope/rows';
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

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'file', visible: false },
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
      { id: 'variable', label: 'Variable', defaultColor: '#222222', defaultVisible: false },
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
    expect(scopeRow(container, 'Function')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'Constant')).not.toHaveClass('opacity-65');
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
      />,
    );

    expect(scopeSwatch(container, 'Imports')).toHaveStyle('background-color: #abcdef');
    expect(scopeSwatch(container, 'References')).toHaveStyle('background-color: #444444');
    expect(scopeRow(container, 'Imports')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'References')).toHaveClass('opacity-65');

    fireEvent.click(screen.getByLabelText('Toggle References'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_EDGE_VISIBILITY',
      payload: { edgeKind: 'reference', visible: true },
    });
  });

  it('shows example tooltip text for edge rows that define examples', async () => {
    render(
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
                examples: [{ label: 'TypeScript', code: 'import { Button } from "./Button";' }],
              },
            },
          ]}
          edgeVisibility={{}}
        />
      </TooltipProvider>,
    );

    fireEvent.pointerMove(screen.getByText('Imports'), { pointerType: 'mouse' });

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Files imported by another file.');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Example');
    expect(screen.getByRole('tooltip')).toHaveTextContent('import { Button } from "./Button";');
  });

  it('shows description-only tooltip text for node rows without examples', async () => {
    render(
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

    fireEvent.pointerMove(screen.getByText('Folder'), { pointerType: 'mouse' });

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Folder');
    expect(tooltip).toHaveTextContent('Directories that group files and other folders.');
    expect(tooltip).not.toHaveTextContent('Example');
  });
});

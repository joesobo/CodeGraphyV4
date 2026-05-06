import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EdgeTypeRows,
  NodeTypeRows,
  resolveScopeRowClassName,
} from '../../../src/webview/components/graphScope/rows';

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
          { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
          { id: 'folder', label: 'Folders', defaultColor: '#222222', defaultVisible: false },
        ]}
        nodeVisibility={{ folder: true }}
      />,
    );

    expect(scopeSwatch(container, 'Files')).toHaveStyle('background-color: #555555');
    expect(scopeSwatch(container, 'Folders')).toHaveStyle('background-color: #222222');
    expect(scopeRow(container, 'Files')).not.toHaveClass('opacity-65');
    expect(scopeRow(container, 'Folders')).not.toHaveClass('opacity-65');

    fireEvent.click(screen.getByLabelText('Toggle Files'));

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
          { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
        ]}
        nodeVisibility={{ file: false }}
      />,
    );

    expect(scopeRow(container, 'Files')).toHaveClass('opacity-65');
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
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EdgesPanel from '../../../src/webview/components/edges/Panel';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('EdgesPanel', () => {
  it('shows edge labels with their current colors', () => {
    graphStore.setState({
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#111111', defaultVisible: true }],
      edgeColors: { import: '#444444' },
      edgeVisibility: { import: true },
    });

    render(<EdgesPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.queryByText('import')).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });

  it('renders edge entries inside a divided list', () => {
    graphStore.setState({
      graphEdgeTypes: [
        { id: 'import', label: 'Imports', defaultColor: '#111111', defaultVisible: true },
        { id: 'call', label: 'Calls', defaultColor: '#222222', defaultVisible: true },
      ],
      edgeColors: {},
      edgeVisibility: { import: true, call: true },
    });

    const { container } = render(<EdgesPanel isOpen={true} onClose={vi.fn()} />);

    expect(container.querySelector('[class*="divide-y"]')).not.toBeNull();
  });

  it('posts edge visibility updates when a toggle changes', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphEdgeTypes: [{ id: 'codegraphy:nests', label: 'Nests', defaultColor: '#222222', defaultVisible: true }],
      edgeColors: {},
      edgeVisibility: { 'codegraphy:nests': true },
    });

    render(<EdgesPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_EDGE_VISIBILITY',
      payload: { edgeKind: 'codegraphy:nests', visible: false },
    });
  });
});

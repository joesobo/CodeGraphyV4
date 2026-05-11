import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraphScopePanel from '../../../src/webview/components/graphScope/Panel';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
}));

function setStoreState() {
  graphStore.setState({
    graphNodeTypes: [
      { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
      { id: 'folder', label: 'Folders', defaultColor: '#222222', defaultVisible: false },
      { id: 'symbol', label: 'Symbols', defaultColor: '#A1A1AA', defaultVisible: false, colorEditable: false },
      { id: 'symbol:function', label: 'Functions', defaultColor: '#8B5CF6', defaultVisible: true, parentId: 'symbol' },
      { id: 'variable', label: 'Variables', defaultColor: '#14B8A6', defaultVisible: false },
    ],
    graphEdgeTypes: [
      { id: 'import', label: 'Imports', defaultColor: '#333333', defaultVisible: true },
      { id: 'reference', label: 'References', defaultColor: '#444444', defaultVisible: true },
    ],
    nodeColors: { file: '#555555' },
    nodeVisibility: { folder: true },
    edgeVisibility: { reference: false },
    legends: [],
  });
}

describe('GraphScopePanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    setStoreState();
  });

  it('returns null when closed', () => {
    const { container } = render(<GraphScopePanel isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('opens on node types by default and toggles node visibility', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Graph Scope')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Edge Types' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle Files'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'file', visible: false },
    });
  });

  it('renders the top-level Symbols toggle without a color swatch and hides child rows until enabled', () => {
    const { container } = render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Symbols')).toBeInTheDocument();
    expect(screen.queryByText('Functions')).not.toBeInTheDocument();
    expect(container.querySelector('[data-scope-swatch="Symbols"]')).toBeNull();

    act(() => {
      graphStore.setState({ nodeVisibility: { folder: true, symbol: true } });
    });

    expect(screen.getByText('Functions')).toBeInTheDocument();
  });

  it('turns off symbol child visibility when Symbols is toggled off', () => {
    graphStore.setState({
      nodeVisibility: {
        folder: true,
        symbol: true,
        variable: true,
        'symbol:function': true,
      },
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle Symbols'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'variable', visible: false },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'symbol:function', visible: false },
    });
    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'symbol', visible: false },
    });
  });

  it('switches to edge types and toggles edge visibility', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));

    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Edge Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.getByText('References')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle References'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_EDGE_VISIBILITY',
      payload: { edgeKind: 'reference', visible: true },
    });
  });

  it('switches back to node types after showing edge types', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));
    fireEvent.click(screen.getByRole('button', { name: 'Node Types' }));

    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Imports')).not.toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('updates edge colors when legend rules change', () => {
    const { container } = render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));

    const importSwatch = container.querySelector('[data-scope-swatch="Imports"]') as HTMLElement;
    expect(importSwatch).toHaveStyle('background-color: #333333');

    act(() => {
      graphStore.setState({
        legends: [{ id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' }],
      });
    });

    expect(importSwatch).toHaveStyle('background-color: #abcdef');
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    render(<GraphScopePanel isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalled();
  });
});

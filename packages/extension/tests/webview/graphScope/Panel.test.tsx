import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GraphScopePanel from '../../../src/webview/components/graphScope/Panel';
import {
  flushGraphScopeVisibilityMessages,
  resetGraphScopeVisibilityMessageQueueForTests,
} from '../../../src/webview/components/graphScope/messages';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
}));

function setStoreState() {
  graphStore.setState({
    graphNodeTypes: [
      { id: 'file', label: 'File', defaultColor: '#111111', defaultVisible: true },
      { id: 'folder', label: 'Folder', defaultColor: '#222222', defaultVisible: false },
      { id: 'symbol', label: 'Symbol', defaultColor: '#7C3AED', defaultVisible: false },
      { id: 'symbol:function', label: 'Function', defaultColor: '#8B5CF6', defaultVisible: true, parentId: 'symbol' },
      { id: 'variable', label: 'Variable', defaultColor: '#14B8A6', defaultVisible: false, parentId: 'symbol' },
      { id: 'symbol:global', label: 'Global', defaultColor: '#0D9488', defaultVisible: false, parentId: 'variable' },
    ],
    graphEdgeTypes: [
      { id: 'import', label: 'Imports', defaultColor: '#333333', defaultVisible: true },
      { id: 'reference', label: 'References', defaultColor: '#444444', defaultVisible: true },
      { id: 'nests', label: 'Nests', defaultColor: '#555555', defaultVisible: false },
    ],
    nodeColors: { file: '#555555' },
    nodeVisibility: { folder: true },
    edgeVisibility: { reference: false },
    graphHasIndex: true,
    graphIndexFreshness: 'fresh',
    legends: [],
  });
}

describe('GraphScopePanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    resetGraphScopeVisibilityMessageQueueForTests();
    setStoreState();
  });

  afterEach(() => {
    resetGraphScopeVisibilityMessageQueueForTests();
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
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Folder')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle File'));
    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { file: false } },
    });
  });

  it('updates node toggles optimistically before the extension responds', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle File'));

    expect(graphStore.getState().nodeVisibility.file).toBe(false);
  });

  it('flushes pending scope messages when closed', () => {
    const { rerender } = render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle File'));
    expect(sentMessages).toEqual([]);

    rerender(<GraphScopePanel isOpen={false} onClose={vi.fn()} />);

    expect(sentMessages).toEqual([{
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { file: false } },
    }]);
  });

  it('optimistically enables parent gates when a variable child is toggled on', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle Global'));

    expect(graphStore.getState().nodeVisibility).toEqual(expect.objectContaining({
      symbol: true,
      variable: true,
      'symbol:global': true,
    }));
    flushGraphScopeVisibilityMessages();
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { 'symbol:global': true } },
    });
  });

  it('renders symbol child rows independently from the top-level Symbol toggle', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Function')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-swatch-Symbol')).not.toBeInTheDocument();

    act(() => {
      graphStore.setState({ nodeVisibility: { folder: true, symbol: true } });
    });

    expect(screen.getByText('Function')).toBeInTheDocument();
  });

  it('preserves symbol child visibility settings when Symbol is toggled off', () => {
    graphStore.setState({
      nodeVisibility: {
        folder: true,
        symbol: true,
        variable: true,
        'symbol:function': true,
      },
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle Symbol'));
    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toEqual([{
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { symbol: false } },
    }]);
  });

  it('switches to edge types and toggles edge visibility', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));

    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Edge Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.getByText('References')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle References'));
    flushGraphScopeVisibilityMessages();

    expect(graphStore.getState().edgeVisibility.reference).toBe(true);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { edgeVisibility: { reference: true } },
    });
  });

  it('keeps structural edge type controls available before the workspace has an index', () => {
    graphStore.setState({
      graphEdgeTypes: [
        { id: 'nests', label: 'Nests', defaultColor: '#555555', defaultVisible: false },
      ],
      graphHasIndex: false,
      graphIndexFreshness: 'missing',
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    const edgeTypesButton = screen.getByRole('button', { name: 'Edge Types' });
    expect(edgeTypesButton).toBeEnabled();

    fireEvent.click(edgeTypesButton);

    expect(edgeTypesButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Nests')).toBeInTheDocument();
  });

  it('disables edge types when the current node scope hides every edge control', () => {
    graphStore.setState({
      graphEdgeTypes: [
        { id: 'nests', label: 'Nests', defaultColor: '#555555', defaultVisible: false },
      ],
      graphHasIndex: false,
      graphIndexFreshness: 'missing',
      nodeVisibility: { folder: false },
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    const edgeTypesButton = screen.getByRole('button', { name: 'Edge Types' });
    expect(edgeTypesButton).toBeDisabled();
  });

  it('keeps relationship edge type controls unavailable before the workspace has an index', () => {
    graphStore.setState({
      graphEdgeTypes: [
        { id: 'reference', label: 'References', defaultColor: '#444444', defaultVisible: true },
        { id: 'nests', label: 'Nests', defaultColor: '#555555', defaultVisible: false },
      ],
      graphHasIndex: false,
      graphIndexFreshness: 'missing',
      nodeVisibility: { folder: false },
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    const edgeTypesButton = screen.getByRole('button', { name: 'Edge Types' });
    expect(edgeTypesButton).toBeDisabled();
  });

  it('returns to node types when the active edge tab becomes unavailable', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));
    expect(screen.getByText('Imports')).toBeInTheDocument();

    act(() => {
      graphStore.setState({
        graphEdgeTypes: [],
        graphHasIndex: false,
        graphIndexFreshness: 'missing',
      });
    });

    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Edge Types' })).toBeDisabled();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.queryByText('Imports')).not.toBeInTheDocument();
  });

  it('enables edge types when the workspace has a stale index', () => {
    graphStore.setState({
      graphHasIndex: true,
      graphIndexFreshness: 'stale',
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    const edgeTypesButton = screen.getByRole('button', { name: 'Edge Types' });
    expect(edgeTypesButton).toBeEnabled();

    fireEvent.click(edgeTypesButton);

    expect(screen.getByText('Imports')).toBeInTheDocument();
  });

  it('hides only the Nests edge toggle when folder nodes are disabled', () => {
    graphStore.setState({ nodeVisibility: { folder: false } });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));

    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.queryByText('Nests')).not.toBeInTheDocument();
  });

  it('shows the Nests edge toggle with its saved state when folder nodes are enabled', () => {
    graphStore.setState({
      nodeVisibility: { folder: true },
      edgeVisibility: { nests: false },
    });
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));
    fireEvent.click(screen.getByLabelText('Toggle Nests'));
    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { edgeVisibility: { nests: true } },
    });
  });

  it('switches back to node types after showing edge types', () => {
    render(<GraphScopePanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edge Types' }));
    fireEvent.click(screen.getByRole('button', { name: 'Node Types' }));

    expect(screen.getByRole('button', { name: 'Node Types' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Imports')).not.toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
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

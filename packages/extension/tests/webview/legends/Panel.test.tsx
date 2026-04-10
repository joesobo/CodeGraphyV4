import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LegendsPanel from '../../../src/webview/components/legends/Panel';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('LegendsPanel', () => {
  it('shows node and edge color controls when open', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      edgeColors: { import: '#444444' },
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Files color')).toHaveValue('#333333');
    expect(screen.getByLabelText('Imports color')).toHaveValue('#444444');
    expect(screen.queryByText('Rules')).not.toBeInTheDocument();
    expect(screen.queryByText('#333333')).not.toBeInTheDocument();
  });

  it('debounces color updates from the node and edge sections', () => {
    sentMessages.length = 0;
    vi.useFakeTimers();
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      edgeColors: { import: '#444444' },
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Files color'), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('Files color'), { target: { value: '#abc123' } });
    fireEvent.change(screen.getByLabelText('Imports color'), { target: { value: '#fedcba' } });
    fireEvent.change(screen.getByLabelText('Imports color'), { target: { value: '#def456' } });

    expect(sentMessages).toEqual([]);

    vi.runAllTimers();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_COLOR',
      payload: { nodeType: 'file', color: '#abc123' },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_EDGE_COLOR',
      payload: { edgeKind: 'import', color: '#def456' },
    });
    expect(sentMessages).toHaveLength(2);
  });

  it('flushes a pending color change when the picker loses focus', () => {
    sentMessages.length = 0;
    vi.useFakeTimers();
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [],
      nodeColors: { file: '#333333' },
      edgeColors: {},
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByLabelText('Files color');
    fireEvent.change(input, { target: { value: '#abcdef' } });
    fireEvent.blur(input);

    expect(sentMessages).toEqual([
      {
        type: 'UPDATE_NODE_COLOR',
        payload: { nodeType: 'file', color: '#abcdef' },
      },
    ]);
  });

  it('renders the rules editor when open', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      edgeColors: { import: '#444444' },
      legends: [
        { id: 'legend:node', pattern: '*/tests/**', color: '#123abc', target: 'node' },
        { id: 'legend:edge', pattern: 'src/**', color: '#321cba', target: 'edge' },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Legends')).toBeInTheDocument();
    expect(screen.queryByText('Rules')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('*/tests/**')).toBeInTheDocument();
    expect(screen.getByDisplayValue('src/**')).toBeInTheDocument();
  });

  it('creates a new legend rule through the node and edge sections', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: {},
      edgeColors: {},
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('New node legend pattern'), {
      target: { value: '*/tests/**' },
    });
    fireEvent.change(screen.getByLabelText('New node legend color'), {
      target: { value: '#123abc' },
    });
    fireEvent.click(screen.getByTitle('Add node legend'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            pattern: '*/tests/**',
            target: 'node',
            color: '#123abc',
          }),
        ],
      },
    });

    fireEvent.change(screen.getByLabelText('New edge legend pattern'), {
      target: { value: 'src/**' },
    });
    fireEvent.change(screen.getByLabelText('New edge legend color'), {
      target: { value: '#fedcba' },
    });
    fireEvent.click(screen.getByTitle('Add edge legend'));

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: expect.arrayContaining([
          expect.objectContaining({
            pattern: '*/tests/**',
            target: 'node',
            color: '#123abc',
          }),
          expect.objectContaining({
            pattern: 'src/**',
            target: 'edge',
            color: '#fedcba',
          }),
        ]),
      },
    });
  });

  it('renders custom edge rules inside the edges section', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: {},
      edgeColors: {},
      legends: [{ id: 'legend:edge', pattern: 'src/**', color: '#321cba', target: 'edge' }],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const edgesSection = screen.getByText('Edges').closest('section');
    expect(edgesSection).not.toBeNull();
    expect(within(edgesSection as HTMLElement).getByDisplayValue('src/**')).toBeInTheDocument();
  });

  it('keeps custom node rules removable and toggleable inside the nodes section', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [{ id: 'legend:node', pattern: '*/tests/**', color: '#123abc', target: 'node' }],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const nodesSection = screen.getByText('Nodes').closest('section');
    expect(nodesSection).not.toBeNull();

    fireEvent.click(within(nodesSection as HTMLElement).getByRole('switch'));

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'legend:node',
            disabled: true,
          }),
        ],
      },
    });

    fireEvent.click(within(nodesSection as HTMLElement).getByTitle('Delete legend rule'));

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGENDS',
      payload: { legends: [] },
    });
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();

    render(<LegendsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

afterEach(() => {
  vi.useRealTimers();
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LegendsPanel from '../../../../src/webview/components/legends/panel/view';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('LegendsPanel', () => {
  it('returns null when the panel is closed', () => {
    const { container } = render(<LegendsPanel isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

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
    expect(screen.queryByText('Top overrides bottom')).not.toBeInTheDocument();
  });

  it('keeps the legend body scrollable when the content grows', () => {
    graphStore.setState({
      graphNodeTypes: Array.from({ length: 12 }, (_, index) => ({
        id: `node-${index}`,
        label: `Node ${index}`,
        defaultColor: '#111111',
        defaultVisible: true,
      })),
      graphEdgeTypes: Array.from({ length: 12 }, (_, index) => ({
        id: `custom:edge-${index}`,
        label: `Edge ${index}`,
        defaultColor: '#222222',
        defaultVisible: true,
      })),
      nodeColors: {},
      edgeColors: {},
      legends: [],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(container.querySelector('.flex-1.min-h-0')).not.toBeNull();
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
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'legend:edge:import',
            pattern: 'import',
            target: 'edge',
            color: '#def456',
          }),
        ],
      },
    });
    expect(sentMessages).toHaveLength(2);
  });

  it('renders edge type color overrides through legend rules without duplicating them as custom rules', () => {
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: {},
      edgeColors: { import: '#222222' },
      legends: [
        { id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Imports color')).toHaveValue('#abcdef');
    expect(screen.queryByDisplayValue('import')).not.toBeInTheDocument();
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

  it('shows plugin default legend rules without exposing delete controls', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [],
      nodeColors: { file: '#333333' },
      edgeColors: {},
      legends: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178c6',
          isPluginDefault: true,
          pluginName: 'TypeScript/JavaScript',
        },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('*.ts')).toBeInTheDocument();
    expect(screen.queryByTitle('Delete legend rule')).not.toBeInTheDocument();
  });

  it('collapses the node and edge legend sections independently', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      edgeColors: { import: '#444444' },
      legends: [{ id: 'legend:node', pattern: '*/tests/**', color: '#123abc', target: 'node' }],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));
    expect(screen.queryByText('Files')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle Edges legend section'));
    expect(screen.queryByText('Imports')).not.toBeInTheDocument();
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

  it('preserves opposite-section user rules when node and edge rules are updated', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: {},
      edgeColors: {},
      legends: [
        { id: 'legend:node:existing', pattern: 'src/**', color: '#123456', target: 'node' },
        { id: 'legend:edge:existing', pattern: 'lib/**', color: '#654321', target: 'edge' },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('src/**'), {
      target: { value: 'src/**/*.ts' },
    });

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'legend:edge:existing',
            pattern: 'lib/**',
            target: 'edge',
          }),
          expect.objectContaining({
            id: 'legend:node:existing',
            pattern: 'src/**/*.ts',
            target: 'node',
          }),
        ],
      },
    });

    fireEvent.change(screen.getByDisplayValue('lib/**'), {
      target: { value: 'call' },
    });

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'legend:node:existing',
            pattern: 'src/**/*.ts',
            target: 'node',
          }),
          expect.objectContaining({
            id: 'legend:edge:existing',
            pattern: 'call',
            target: 'edge',
          }),
        ],
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

  it('does not render the old left-border bar styling on custom rows', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [{ id: 'legend:node', pattern: '*/types.ts', color: '#ffffff', target: 'node' }],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(container.querySelector('[class*="border-l"]')).toBeNull();
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

  it('toggles plugin default legend visibility through a dedicated message', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178c6',
          isPluginDefault: true,
          pluginName: 'TypeScript/JavaScript',
        },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
      payload: {
        legendId: 'plugin:codegraphy.typescript:*.ts',
        visible: false,
      },
    });
    expect(graphStore.getState().optimisticLegendUpdates).toEqual({
      'plugin:codegraphy.typescript:*.ts': expect.objectContaining({
        updates: { disabled: true },
      }),
    });
  });

  it('applies optimistic visibility updates and messages for edge plugin defaults', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [
        {
          id: 'plugin:routing:call',
          pattern: 'call',
          color: '#3178c6',
          target: 'edge',
          isPluginDefault: true,
          pluginName: 'Routing',
        },
      ],
      optimisticLegendUpdates: {},
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
      payload: {
        legendId: 'plugin:routing:call',
        visible: false,
      },
    });
    expect(graphStore.getState().optimisticLegendUpdates).toEqual({
      'plugin:routing:call': expect.objectContaining({
        updates: { disabled: true },
      }),
    });
  });

  it('reorders node legend rules through drag and drop', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [
        { id: 'legend:first', pattern: 'src/**', color: '#111111', target: 'node' },
        { id: 'legend:second', pattern: 'tests/**', color: '#222222', target: 'node' },
      ],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);
    const draggableRows = container.querySelectorAll('[data-testid="legend-rule-row"][draggable="true"]');

    fireEvent.dragStart(draggableRows[1] as Element);
    fireEvent.dragOver(draggableRows[0] as Element);
    fireEvent.drop(draggableRows[0] as Element);

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGEND_ORDER',
      payload: {
        legendIds: ['legend:second', 'legend:first'],
      },
    });
  });

  it('reorders edge legend rules through drag and drop', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      edgeColors: {},
      legends: [
        { id: 'legend:node', pattern: 'src/**', color: '#111111', target: 'node' },
        { id: 'legend:edge:first', pattern: 'import', color: '#222222', target: 'edge' },
        { id: 'legend:edge:second', pattern: 'call', color: '#333333', target: 'edge' },
      ],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);
    const draggableRows = container.querySelectorAll('[data-testid="legend-rule-row"][draggable="true"]');

    fireEvent.dragStart(draggableRows[2] as Element);
    fireEvent.dragOver(draggableRows[1] as Element);
    fireEvent.drop(draggableRows[1] as Element);

    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_LEGEND_ORDER',
      payload: {
        legendIds: ['legend:node', 'legend:edge:second', 'legend:edge:first'],
      },
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

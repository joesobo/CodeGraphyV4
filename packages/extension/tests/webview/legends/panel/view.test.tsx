import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LegendsPanel from '../../../../src/webview/components/legends/panel/view';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];
let mockWebviewState: unknown;

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  getVsCodeApi: () => ({
    getState: () => mockWebviewState,
    setState: vi.fn((state: unknown) => {
      mockWebviewState = state;
    }),
  }),
}));

describe('LegendsPanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    mockWebviewState = undefined;
    graphStore.setState({
      legends: [],
      optimisticLegendUpdates: {},
      optimisticUserLegends: null,
    });
  });

  it('returns null when the panel is closed', () => {
    const { container } = render(<LegendsPanel isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('shows node and edge color controls when open', () => {
    graphStore.setState({
      graphNodeTypes: [
        { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
        { id: 'folder', label: 'Folders', defaultColor: '#222222', defaultVisible: true },
      ],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#444444', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Files color')).toHaveValue('#333333');
    expect(screen.getByLabelText('Toggle Files legend color')).toHaveAttribute('data-state', 'checked');
    expect(screen.queryByLabelText('Folders color')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Imports color')).toHaveValue('#444444');
    expect(screen.queryByLabelText('Toggle Imports legend color')).not.toBeInTheDocument();
    expect(screen.queryByText('Rules')).not.toBeInTheDocument();
    expect(screen.queryByText('#333333')).not.toBeInTheDocument();
    expect(screen.queryByText('Top overrides bottom')).not.toBeInTheDocument();
  });

  it('defaults file and package built-in legend color toggles to on', () => {
    graphStore.setState({
      graphNodeTypes: [
        { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
        { id: 'package', label: 'Packages', defaultColor: '#222222', defaultVisible: false },
      ],
      graphEdgeTypes: [],
      nodeColors: {
        file: '#111111',
        package: '#222222',
      },
      nodeVisibility: {
        file: true,
        package: false,
      },
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Toggle Files legend color')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Toggle Packages legend color')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Files color')).not.toBeDisabled();
    expect(screen.getByLabelText('Packages color')).not.toBeDisabled();
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
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#444444', defaultVisible: true }],
      nodeColors: { file: '#333333' },
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
      payload: { nodeType: 'file', color: '#ABC123', enabled: true },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_LEGENDS',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'legend:edge:import',
            pattern: 'import',
            target: 'edge',
            color: '#DEF456',
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
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByLabelText('Files color');
    fireEvent.change(input, { target: { value: '#abcdef' } });
    fireEvent.blur(input);

    expect(sentMessages).toEqual([
      {
        type: 'UPDATE_NODE_COLOR',
        payload: { nodeType: 'file', color: '#ABCDEF', enabled: true },
      },
    ]);
  });

  it('toggles built-in node colors between their override and fallback color', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [],
      nodeColors: { file: '#333333' },
      legends: [],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const colorToggle = screen.getByLabelText('Toggle Files legend color');
    const colorInput = screen.getByLabelText('Files color');

    fireEvent.click(colorToggle);

    expect(colorToggle).toHaveAttribute('data-state', 'unchecked');
    expect(colorInput).toBeDisabled();
    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_NODE_COLOR',
      payload: { nodeType: 'file', color: '#111111', enabled: false },
    });

    fireEvent.click(colorToggle);

    expect(colorToggle).toHaveAttribute('data-state', 'checked');
    expect(colorInput).not.toBeDisabled();
    expect(sentMessages.at(-1)).toEqual({
      type: 'UPDATE_NODE_COLOR',
      payload: { nodeType: 'file', color: '#333333', enabled: true },
    });
  });

  it('batches material theme visibility updates through a single message', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      legends: [
        {
          id: 'default:fileExtension:py',
          pattern: '*.py',
          color: '#3776ab',
          isPluginDefault: true,
          pluginId: 'codegraphy.material',
          pluginName: 'Material Icon Theme',
        },
        {
          id: 'default:fileName:package.json',
          pattern: 'package.json',
          color: '#8cc84b',
          isPluginDefault: true,
          pluginId: 'codegraphy.material',
          pluginName: 'Material Icon Theme',
        },
      ],
      optimisticLegendUpdates: {},
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Toggle Material Icon Theme legend entries'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY_BATCH',
      payload: {
        legendVisibility: {
          'default:fileExtension:py': false,
          'default:fileName:package.json': false,
        },
      },
    });
    expect(sentMessages).toHaveLength(1);
    expect(graphStore.getState().optimisticLegendUpdates).toEqual({
      'default:fileExtension:py': expect.objectContaining({
        updates: { disabled: true },
      }),
      'default:fileName:package.json': expect.objectContaining({
        updates: { disabled: true },
      }),
    });
  });

  it('persists collapsed legend sections across renders', () => {
    mockWebviewState = undefined;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      legends: [],
    });

    const { unmount } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Toggle Nodes legend section'));
    expect(mockWebviewState).toEqual({
      legendPanelCollapsed: {
        'section:nodes': true,
      },
    });

    unmount();
    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.queryByText('Files')).not.toBeInTheDocument();
    expect(screen.getByText('Edges')).toBeInTheDocument();
  });

  it('renders the rules editor when open', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
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
            color: '#123ABC',
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
            color: '#123ABC',
          }),
          expect.objectContaining({
            pattern: 'src/**',
            target: 'edge',
            color: '#FEDCBA',
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
      legends: [
        { id: 'legend:node:existing', pattern: 'src/**', color: '#123456', target: 'node' },
        { id: 'legend:edge:existing', pattern: 'lib/**', color: '#654321', target: 'edge' },
      ],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('src/**'), {
      target: { value: 'src/**/*.ts' },
    });
    fireEvent.blur(screen.getByDisplayValue('src/**/*.ts'));

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
    fireEvent.blur(screen.getByDisplayValue('call'));

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
      legends: [{ id: 'legend:node', pattern: '*/tests/**', color: '#123abc', target: 'node' }],
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const nodesSection = screen.getByText('Nodes').closest('section');
    expect(nodesSection).not.toBeNull();

    fireEvent.click(within(nodesSection as HTMLElement).getByTitle('Toggle */tests/** legend entry'));

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

    fireEvent.click(screen.getByTitle('Toggle *.ts legend entry'));

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

    fireEvent.click(screen.getByTitle('Toggle call legend entry'));

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

  it('keeps multiple plugin-group toggles disabled locally before the extension responds', () => {
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      legends: [
        {
          id: 'plugin:codegraphy.python:*.py',
          pattern: '*.py',
          color: '#3776ab',
          isPluginDefault: true,
          pluginId: 'codegraphy.python',
          pluginName: 'Python',
        },
        {
          id: 'plugin:codegraphy.python:*.pyi',
          pattern: '*.pyi',
          color: '#3776ab',
          isPluginDefault: true,
          pluginId: 'codegraphy.python',
          pluginName: 'Python',
        },
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178c6',
          isPluginDefault: true,
          pluginId: 'codegraphy.typescript',
          pluginName: 'TypeScript',
        },
      ],
      optimisticLegendUpdates: {},
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    const pythonToggle = screen.getByLabelText('Toggle Python legend entries');
    const typescriptToggle = screen.getByLabelText('Toggle TypeScript legend entries');

    fireEvent.click(pythonToggle);
    expect(pythonToggle).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(typescriptToggle);
    expect(pythonToggle).toHaveAttribute('data-state', 'unchecked');
    expect(typescriptToggle).toHaveAttribute('data-state', 'unchecked');
  });

  it('reorders node legend rules through drag and drop', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [],
      graphEdgeTypes: [],
      nodeColors: {},
      legends: [
        { id: 'legend:first', pattern: 'src/**', color: '#111111', target: 'node' },
        { id: 'legend:second', pattern: 'tests/**', color: '#222222', target: 'node' },
      ],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);
    const rowTargets = container.querySelectorAll('[data-testid="legend-rule-row"]');
    const dragHandles = screen.getAllByTitle('Drag legend rule');

    fireEvent.dragStart(dragHandles[1] as Element);
    fireEvent.dragOver(rowTargets[0] as Element);
    fireEvent.drop(rowTargets[0] as Element);

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
      legends: [
        { id: 'legend:node', pattern: 'src/**', color: '#111111', target: 'node' },
        { id: 'legend:edge:first', pattern: 'import', color: '#222222', target: 'edge' },
        { id: 'legend:edge:second', pattern: 'call', color: '#333333', target: 'edge' },
      ],
    });

    const { container } = render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);
    const rowTargets = container.querySelectorAll('[data-testid="legend-rule-row"]');
    const dragHandles = screen.getAllByTitle('Drag legend rule');

    fireEvent.dragStart(dragHandles[2] as Element);
    fireEvent.dragOver(rowTargets[1] as Element);
    fireEvent.drop(rowTargets[1] as Element);

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
  mockWebviewState = undefined;
});

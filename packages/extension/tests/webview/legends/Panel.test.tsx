import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LegendsPanel from '../../../src/webview/components/legends/Panel';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/components/settingsPanel/groups/Section', () => ({
  GroupsSection: () => <div data-testid="groups-section">Groups Section</div>,
}));

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
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Files color')).toHaveValue('#333333');
    expect(screen.getByLabelText('Imports color')).toHaveValue('#444444');
  });

  it('posts color updates from the node and edge sections', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      graphEdgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#222222', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      edgeColors: { import: '#444444' },
    });

    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Files color'), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('Imports color'), { target: { value: '#fedcba' } });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_COLOR',
      payload: { nodeType: 'file', color: '#abcdef' },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_EDGE_COLOR',
      payload: { edgeKind: 'import', color: '#fedcba' },
    });
  });

  it('returns null when closed', () => {
    const { container } = render(<LegendsPanel isOpen={false} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the legends header and groups content when open', () => {
    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Legends')).toBeInTheDocument();
    expect(screen.getByTestId('groups-section')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();

    render(<LegendsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

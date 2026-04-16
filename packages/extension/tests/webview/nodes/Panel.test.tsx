import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NodesPanel from '../../../src/webview/components/nodes/Panel';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('NodesPanel', () => {
  it('renders nothing while closed', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      nodeColors: {},
      nodeVisibility: {},
    });

    const { container } = render(<NodesPanel isOpen={false} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows node labels with their current colors', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      nodeColors: { file: '#333333' },
      nodeVisibility: { file: true },
    });

    render(<NodesPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.queryByText('file')).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('h-6', 'w-6');
  });

  it('renders node entries inside a divided list', () => {
    graphStore.setState({
      graphNodeTypes: [
        { id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true },
        { id: 'folder', label: 'Folders', defaultColor: '#222222', defaultVisible: true },
      ],
      nodeColors: {},
      nodeVisibility: { file: true, folder: true },
    });

    const { container } = render(<NodesPanel isOpen={true} onClose={vi.fn()} />);

    expect(container.querySelector('[class*="divide-y"]')).not.toBeNull();
  });

  it('renders node entries without subtitles', () => {
    graphStore.setState({
      graphNodeTypes: [{ id: 'file', label: 'Files', defaultColor: '#111111', defaultVisible: true }],
      nodeColors: {},
      nodeVisibility: { file: true },
    });

    render(<NodesPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.queryByText('file')).not.toBeInTheDocument();
  });

  it('posts node visibility updates when a toggle changes', () => {
    sentMessages.length = 0;
    graphStore.setState({
      graphNodeTypes: [{ id: 'folder', label: 'Folders', defaultColor: '#222222', defaultVisible: false }],
      nodeColors: {},
      nodeVisibility: { folder: false },
    });

    render(<NodesPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_NODE_VISIBILITY',
      payload: { nodeType: 'folder', visible: true },
    });
  });

  it('falls back to default node colors and visibility and wires the close button', () => {
    const onClose = vi.fn();
    graphStore.setState({
      graphNodeTypes: [{ id: 'package', label: 'Packages', defaultColor: '#fedcba', defaultVisible: false }],
      nodeColors: {},
      nodeVisibility: {},
    });

    const { container } = render(<NodesPanel isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({ backgroundColor: '#fedcba' });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

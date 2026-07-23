// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestShape {
  id: string;
  meta: Record<string, unknown>;
  props?: Record<string, unknown>;
  type: string;
}

const NODE_A = {
  id: 'shape:node-a',
  type: 'geo',
  meta: {
    codegraphyEntityId: 'src/App.tsx',
    codegraphyKind: 'node',
    codegraphyNodeType: 'file',
  },
  props: {},
} satisfies TestShape;

const NODE_B = {
  id: 'shape:node-b',
  type: 'geo',
  meta: {
    codegraphyEntityId: 'src/theme.css',
    codegraphyKind: 'node',
    codegraphyNodeType: 'file',
  },
  props: {},
} satisfies TestShape;

const ICON_A = {
  id: 'shape:icon-a',
  type: 'image',
  meta: {
    codegraphyKind: 'icon',
    codegraphyNodeId: 'src/App.tsx',
  },
  props: {},
} satisfies TestShape;

const EDGE_A_B = {
  id: 'shape:edge-a-b',
  type: 'arrow',
  meta: {
    codegraphyFrom: 'src/App.tsx',
    codegraphyKind: 'edge',
    codegraphyRelationshipKind: 'import',
    codegraphyTo: 'src/theme.css',
  },
  props: {},
} satisfies TestShape;

const EDGE_B_A = {
  id: 'shape:edge-b-a',
  type: 'arrow',
  meta: {
    codegraphyFrom: 'src/theme.css',
    codegraphyKind: 'edge',
    codegraphyRelationshipKind: 'reference',
    codegraphyTo: 'src/App.tsx',
  },
  props: {},
} satisfies TestShape;

const mocks = vi.hoisted(() => {
  return {
    getCurrentPageShapes: vi.fn(),
    getEditingShape: vi.fn(),
    getOnlySelectedShape: vi.fn(),
    setEditingShape: vi.fn(),
  };
});

vi.mock('tldraw', () => {
  const editor = {
    getCurrentPageShapes: mocks.getCurrentPageShapes,
    getEditingShape: mocks.getEditingShape,
    getOnlySelectedShape: mocks.getOnlySelectedShape,
    setEditingShape: mocks.setEditingShape,
  };
  return {
    useEditor: () => editor,
    useValue: (_name: string, read: () => unknown) => read(),
  };
});

import { NodeInspectorPanel } from '../../../src/documentRuntime/nodeInspector/view';

function activateNode(rendered: RenderResult, shape: TestShape): void {
  mocks.getEditingShape.mockReturnValue(shape);
  mocks.getOnlySelectedShape.mockReturnValue(shape);
  rendered.rerender(createElement(NodeInspectorPanel));
}

describe('CodeGraphy tldraw node inspector view', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentPageShapes.mockReturnValue([NODE_A, NODE_B, ICON_A, EDGE_A_B, EDGE_B_A]);
    mocks.getEditingShape.mockReturnValue(null);
    mocks.getOnlySelectedShape.mockReturnValue(null);
  });

  it('reuses one right-side inspector when the user double-clicks different nodes', () => {
    const rendered = render(createElement(NodeInspectorPanel));

    activateNode(rendered, NODE_A);

    const inspector = screen.getByRole('region', { name: 'CodeGraphy node inspector' });
    expect(screen.getByRole('heading', { name: 'App.tsx' })).toBeTruthy();
    expect(screen.getByText('src/App.tsx')).toBeTruthy();
    expect(screen.getByText('TSX')).toBeTruthy();
    expect(screen.getByText('2 total')).toBeTruthy();
    expect(screen.getByText('1 incoming')).toBeTruthy();
    expect(screen.getByText('1 outgoing')).toBeTruthy();
    expect(screen.getAllByText('theme.css')).toHaveLength(2);
    expect(mocks.setEditingShape).toHaveBeenCalledWith(null);

    activateNode(rendered, NODE_B);

    expect(screen.getByRole('region', { name: 'CodeGraphy node inspector' })).toBe(inspector);
    expect(screen.getByRole('heading', { name: 'theme.css' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'App.tsx' })).toBeNull();
  });

  it('clears the inspector when no generated node is active', () => {
    const rendered = render(createElement(NodeInspectorPanel));
    activateNode(rendered, NODE_A);

    mocks.getEditingShape.mockReturnValue(null);
    mocks.getOnlySelectedShape.mockReturnValue(null);
    rendered.rerender(createElement(NodeInspectorPanel));

    expect(screen.queryByRole('region', { name: 'CodeGraphy node inspector' })).toBeNull();
  });

  it('treats a generated icon as part of its node', () => {
    const rendered = render(createElement(NodeInspectorPanel));

    activateNode(rendered, ICON_A);

    expect(screen.getByRole('heading', { name: 'App.tsx' })).toBeTruthy();
  });

  it('leaves room for the tldraw style and toolbar windows', () => {
    const rendered = render(createElement(NodeInspectorPanel));
    activateNode(rendered, NODE_A);

    const inspector = screen.getByRole('region', { name: 'CodeGraphy node inspector' });
    expect(inspector.style.right).toBe('216px');
    expect(inspector.style.top).toBe('104px');
    expect(inspector.style.bottom).toBe('96px');
  });
});

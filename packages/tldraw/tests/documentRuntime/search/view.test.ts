// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentPageShapes: vi.fn(),
  getShapePageBounds: vi.fn(),
  selectNone: vi.fn(),
  zoomToBounds: vi.fn(),
}));

vi.mock('tldraw', () => ({
  useEditor: () => ({
    getCurrentPageShapes: mocks.getCurrentPageShapes,
    getShapePageBounds: mocks.getShapePageBounds,
    selectNone: mocks.selectNone,
    zoomToBounds: mocks.zoomToBounds,
  }),
  useValue: (_name: string, read: () => unknown) => read(),
}));

import { graphSearchEventName } from '../../../src/documentRuntime/search/model';
import { GraphSearchPanel } from '../../../src/documentRuntime/search/view';

describe('CodeGraphy tldraw graph search view', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentPageShapes.mockReturnValue([
      {
        id: 'shape:app',
        type: 'geo',
        x: 0,
        y: 0,
        props: { h: 120, w: 120 },
        meta: { codegraphyEntityId: 'src/App.tsx', codegraphyKind: 'node' },
      },
      {
        id: 'shape:theme',
        type: 'geo',
        x: 0,
        y: 0,
        props: { h: 120, w: 120 },
        meta: { codegraphyEntityId: 'src/theme.css', codegraphyKind: 'node' },
      },
    ]);
    mocks.getShapePageBounds.mockImplementation((shapeId: string) => (
      shapeId === 'shape:app'
        ? { h: 120, w: 120, x: 20, y: 40 }
        : { h: 120, w: 120, x: 500, y: 600 }
    ));
  });

  it('filters rendered graph shapes and publishes the query to physics', () => {
    const queries: string[] = [];
    window.addEventListener(graphSearchEventName, event => {
      queries.push((event as CustomEvent<{ query: string }>).detail.query);
    }, { once: true });
    render(createElement(GraphSearchPanel));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search files' }), {
      target: { value: 'APP' },
    });

    const visibilityStyle = document.querySelector(
      'style[data-codegraphy-search-visibility]',
    );
    expect(visibilityStyle?.textContent).toContain('[data-shape-id="shape:theme"]');
    expect(visibilityStyle?.textContent).not.toContain('[data-shape-id="shape:app"]');
    expect(queries).toEqual(['app']);
    expect(mocks.selectNone).toHaveBeenCalledOnce();
    expect(mocks.zoomToBounds).toHaveBeenCalledWith(
      { h: 120, w: 120, x: 20, y: 40 },
      {
        animation: { duration: 200 },
        inset: 160,
        targetZoom: 1,
      },
    );
  });

  it('clears the query and restores every graph shape', () => {
    render(createElement(GraphSearchPanel));
    const search = screen.getByRole('searchbox', { name: 'Search files' });
    fireEvent.change(search, { target: { value: 'theme' } });

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect((search as HTMLInputElement).value).toBe('');
    expect(document.querySelector('style[data-codegraphy-search-visibility]')?.textContent)
      .toBe('');
  });

  it('places the search control across the top without using document space', () => {
    render(createElement(GraphSearchPanel));

    const searchPanel = screen.getByRole('search', { name: 'CodeGraphy graph search' });
    expect(searchPanel.style.position).toBe('absolute');
    expect(searchPanel.style.top).toBe('12px');
    expect(searchPanel.style.right).toBe('176px');
  });
});

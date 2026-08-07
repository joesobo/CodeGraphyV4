import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PANE_LAYOUT, PANE_LAYOUT_STORAGE_KEY } from '../paneLayout';
import { WorkspacePanes } from './WorkspacePanes';

describe('Workspace pane splitters', () => {
  const animationFrames: FrameRequestCallback[] = [];
  const stored = new Map<string, string>();
  const storage: Storage = {
    get length() { return stored.size; },
    clear: () => stored.clear(),
    getItem: key => stored.get(key) ?? null,
    key: index => [...stored.keys()][index] ?? null,
    removeItem: key => { stored.delete(key); },
    setItem: (key, value) => { stored.set(key, value); },
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', storage);
    window.localStorage.clear();
    animationFrames.length = 0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    vi.stubGlobal('ResizeObserver', class {
      disconnect(): void {}
      observe(): void {}
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1_200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('renders two labeled vertical separators and persists keyboard resizing', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <WorkspacePanes
        editorPane={<section>Editor</section>}
        filesPane={<aside>Files</aside>}
        graphPane={<aside>Graph</aside>}
      />,
    ));
    const separators = host.querySelectorAll<HTMLElement>('[role="separator"]');
    expect(separators).toHaveLength(2);
    expect([...separators].map(separator => [
      separator.getAttribute('aria-label'),
      separator.getAttribute('aria-orientation'),
    ])).toEqual([
      ['Resize File hierarchy and editor panes', 'vertical'],
      ['Resize editor and Relationship Graph panes', 'vertical'],
    ]);
    const before = host.querySelector<HTMLElement>('.workspace-grid')?.style.gridTemplateColumns;
    await act(async () => {
      separators[0]?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    });
    await act(async () => animationFrames.splice(0).forEach(callback => callback(0)));
    expect(host.querySelector<HTMLElement>('.workspace-grid')?.style.gridTemplateColumns).not.toBe(before);
    expect(JSON.parse(window.localStorage.getItem(PANE_LAYOUT_STORAGE_KEY) ?? 'null')).not.toEqual(DEFAULT_PANE_LAYOUT);

    await act(async () => {
      separators[1]?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });
    expect(JSON.parse(window.localStorage.getItem(PANE_LAYOUT_STORAGE_KEY) ?? 'null')).toEqual(DEFAULT_PANE_LAYOUT);
    await act(async () => root.unmount());
  });

  it('collapses either side pane without discarding the editor or saved proportions', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const panes = (filesVisible: boolean, graphVisible: boolean) => (
      <WorkspacePanes
        editorPane={<section data-pane="editor">Editor</section>}
        filesPane={<aside data-pane="files">Files</aside>}
        filesVisible={filesVisible}
        graphPane={<aside data-pane="graph">Graph</aside>}
        graphVisible={graphVisible}
      />
    );

    await act(async () => root.render(panes(false, true)));
    expect(host.querySelector('[data-pane="files"]')).toBeNull();
    expect(host.querySelector('[data-pane="editor"]')).not.toBeNull();
    expect(host.querySelector('[data-pane="graph"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);

    await act(async () => root.render(panes(true, false)));
    expect(host.querySelector('[data-pane="files"]')).not.toBeNull();
    expect(host.querySelector('[data-pane="graph"]')).toBeNull();
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);

    await act(async () => root.render(panes(false, false)));
    expect(host.querySelector('[data-pane="editor"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(0);
    expect(window.localStorage.getItem(PANE_LAYOUT_STORAGE_KEY)).toBeNull();
    await act(async () => root.unmount());
  });
});

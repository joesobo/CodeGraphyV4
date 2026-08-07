import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileTreeEntry } from '../model';

vi.mock('../materialIconTheme', () => ({ resolveMaterialIcon: vi.fn(async () => undefined) }));

import { FileTree } from './FileTree';

const entries: FileTreeEntry[] = [{
  kind: 'folder',
  name: 'src',
  path: 'src',
  children: [
    { kind: 'file', name: 'main.ts', path: 'src/main.ts' },
    {
      kind: 'folder',
      name: 'graph',
      path: 'src/graph',
      children: [{ kind: 'file', name: 'camera.ts', path: 'src/graph/camera.ts' }],
    },
  ],
}];

function key(target: Element, value: string, options: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value, ...options }));
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (!descriptor?.set) throw new Error('The input value setter is unavailable.');
  descriptor.set.bind(input)(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('File hierarchy keyboard and filter behavior', () => {
  const animationFrames: FrameRequestCallback[] = [];

  beforeEach(() => {
    animationFrames.length = 0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('keeps a roving focus while opening Files and navigating visible rows', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onSelect = vi.fn();
    await act(async () => root.render(
      <FileTree entries={entries} onSelect={onSelect} selectedPath="src/main.ts" />,
    ));
    const main = host.querySelector<HTMLButtonElement>('[data-tree-path="src/main.ts"]');
    await act(async () => main?.focus());
    await act(async () => main?.click());
    expect(onSelect).toHaveBeenCalledWith('src/main.ts');
    expect(document.activeElement).toBe(
      host.querySelector('[data-tree-path="src/main.ts"]'),
    );

    await act(async () => { if (main) key(main, 'ArrowDown'); });
    await act(async () => animationFrames.splice(0).forEach(callback => callback(0)));
    const graphFolder = host.querySelector<HTMLButtonElement>('[data-tree-path="src/graph"]');
    expect(document.activeElement).toBe(graphFolder);
    await act(async () => { if (graphFolder) key(graphFolder, 'ArrowRight'); });
    await act(async () => animationFrames.splice(0).forEach(callback => callback(0)));
    expect(document.activeElement).toBe(
      host.querySelector('[data-tree-path="src/graph/camera.ts"]'),
    );
    expect(host.querySelectorAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
    await act(async () => root.unmount());
  });

  it('filters relative paths, keeps ancestors, reports empty results, and Escape restores the tree', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <FileTree entries={entries} onSelect={() => undefined} selectedPath="src/main.ts" />,
    ));
    const main = host.querySelector<HTMLButtonElement>('[data-tree-path="src/main.ts"]');
    await act(async () => main?.focus());
    await act(async () => { if (main) key(main, 'f', { metaKey: true }); });
    const filter = host.querySelector<HTMLInputElement>('input[type="search"]');
    expect(document.activeElement).toBe(filter);

    await act(async () => {
      if (!filter) return;
      setInputValue(filter, 'graph/cam');
    });
    expect([...host.querySelectorAll<HTMLElement>('[role="treeitem"]')].map(item => item.dataset.treePath))
      .toEqual(['src', 'src/graph', 'src/graph/camera.ts']);

    await act(async () => {
      if (!filter) return;
      setInputValue(filter, 'not-present');
    });
    expect(host.textContent).toContain('No Files or Folders match');
    await act(async () => { if (filter) key(filter, 'Escape'); });
    await act(async () => animationFrames.splice(0).forEach(callback => callback(0)));
    expect(host.querySelectorAll('[role="treeitem"]')).toHaveLength(4);
    expect(document.activeElement).toBe(
      host.querySelector('[data-tree-path="src/main.ts"]'),
    );
    await act(async () => root.unmount());
  });
});

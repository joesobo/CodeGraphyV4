import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCodeEditor } from './createCodeEditor';

describe('Code editor focus ownership', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      disconnect(): void {}
      observe(): void {}
    });
    Object.defineProperties(Range.prototype, {
      getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
      getClientRects: { configurable: true, value: () => [] },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('keeps hierarchy focus when a File creates a One Dark-highlighted editor', async () => {
    const hierarchyItem = document.createElement('button');
    const editorHost = document.createElement('div');
    document.body.append(hierarchyItem, editorHost);
    hierarchyItem.focus();
    const destroy = await createCodeEditor({
      content: 'export const answer = 42;',
      onChange: () => undefined,
      onSave: () => undefined,
      parent: editorHost,
      path: 'src/main.ts',
    });

    expect(document.activeElement).toBe(hierarchyItem);
    expect(editorHost.querySelector('.cm-editor')).not.toBeNull();
    expect(editorHost.querySelector('.cm-line')?.textContent).toBe('export const answer = 42;');
    expect(document.head.textContent).toContain('#c678dd');

    destroy();
  });
});

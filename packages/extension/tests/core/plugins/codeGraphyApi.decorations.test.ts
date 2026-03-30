import { describe, expect, it } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';

describe('CodeGraphyAPIImpl decorations', () => {
  it('adds and removes node decorations', () => {
    const { api, decorationManager } = createTestAPI();

    const disposable = api.decorateNode('a.ts', { color: '#ff0000' });
    expect(decorationManager.getMergedNodeDecorations().get('a.ts')).toEqual({ color: '#ff0000' });

    disposable.dispose();
    expect(decorationManager.getMergedNodeDecorations().has('a.ts')).toBe(false);
  });

  it('adds and removes edge decorations', () => {
    const { api, decorationManager } = createTestAPI();

    const disposable = api.decorateEdge('a.ts->b.ts', { color: '#00ff00', width: 3 });
    expect(decorationManager.getMergedEdgeDecorations().get('a.ts->b.ts')).toEqual({ color: '#00ff00', width: 3 });

    disposable.dispose();
    expect(decorationManager.getMergedEdgeDecorations().has('a.ts->b.ts')).toBe(false);
  });

  it('clears only the current plugin decorations', () => {
    const { api, decorationManager } = createTestAPI('plugin-a');

    api.decorateNode('a.ts', { color: '#ff0000' });
    decorationManager.decorateNode('plugin-b', 'a.ts', { color: '#0000ff' });

    api.clearDecorations();

    expect(decorationManager.getMergedNodeDecorations().get('a.ts')).toEqual({ color: '#0000ff' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';
import type { IGraphData } from '@/shared/graph/types';
import type { IViewContext } from '@/core/views/contracts';

describe('CodeGraphyAPIImpl cleanup', () => {
  it('disposes event handlers, decorations, commands, views, and webview listeners', () => {
    const { api, eventBus, decorationManager, viewRegistry } = createTestAPI('plugin-a');
    const handler = vi.fn();

    api.on('analysis:started', handler);
    api.decorateNode('a.ts', { color: '#ff0000' });
    api.decorateEdge('a.ts->b.ts', { color: '#00ff00' });
    api.registerCommand({ id: 'cmd1', title: 'Cmd 1', action: vi.fn() });
    api.registerContextMenuItem({ label: 'Item 1', when: 'node', action: vi.fn() });
    api.onWebviewMessage(vi.fn());
    api.registerView({
      id: 'test-view',
      name: 'Test View',
      icon: 'symbol-file',
      description: 'A test view',
      transform: (data: IGraphData, _context: IViewContext) => data,
    });

    decorationManager.decorateNode('plugin-b', 'a.ts', { color: '#0000ff' });

    api.disposeAll();
    eventBus.emit('analysis:started', { fileCount: 1 });
    api.deliverWebviewMessage({ type: 'test', data: null });

    expect(handler).not.toHaveBeenCalled();
    expect(api.commands).toHaveLength(0);
    expect(api.contextMenuItems).toHaveLength(0);
    expect(viewRegistry.get('test-view')).toBeUndefined();
    expect(decorationManager.getMergedNodeDecorations().get('a.ts')).toEqual({ color: '#0000ff' });
    expect(decorationManager.getMergedEdgeDecorations().has('a.ts->b.ts')).toBe(false);
    expect(() => api.on('analysis:started', vi.fn())).toThrow('already been disposed');
  });
});

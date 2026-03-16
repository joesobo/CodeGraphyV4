import { describe, expect, it, vi } from 'vitest';
import { createGraphKeyboardListener } from '../../../src/webview/components/graph/keyboardListener';
import type { GraphKeyboardEffect } from '../../../src/webview/components/graphKeyboardEffects';
import type { GraphKeyboardEffectHandlers } from '../../../src/webview/components/graph/effects/keyboard';

function createKeyboardEvent(
  key: string,
  overrides: Partial<KeyboardEvent> = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as never;
}

describe('graph/keyboardListener', () => {
  it('runs keyboard effects with the current graph node ids', () => {
    const runEffects = vi.fn();
    const setSelection = vi.fn();
    const openNode = vi.fn();
    const handleKeyDown = createGraphKeyboardListener({
      dispatchStoreMessage: vi.fn(),
      fitView: vi.fn(),
      getAllNodeIds: () => ['a.ts', 'b.ts'],
      graphMode: '2d',
      openNode,
      postMessage: vi.fn(),
      runEffects: runEffects as never,
      selectedNodeIds: ['a.ts'],
      setSelection,
      zoom2d: vi.fn(),
    });

    handleKeyDown(createKeyboardEvent('a', { ctrlKey: true }));

    expect(runEffects).toHaveBeenCalledWith(
      [{ kind: 'selectAll', nodeIds: ['a.ts', 'b.ts'] }],
      expect.objectContaining({
        clearSelection: expect.any(Function),
        openSelectedNodes: expect.any(Function),
        selectAll: setSelection,
      }),
    );
  });

  it('ignores shortcuts while focus is inside editable targets', () => {
    const runEffects = vi.fn();
    const handleKeyDown = createGraphKeyboardListener({
      dispatchStoreMessage: vi.fn(),
      fitView: vi.fn(),
      getAllNodeIds: () => ['a.ts'],
      graphMode: '2d',
      openNode: vi.fn(),
      postMessage: vi.fn(),
      runEffects: runEffects as never,
      selectedNodeIds: ['a.ts'],
      setSelection: vi.fn(),
      zoom2d: vi.fn(),
    });

    handleKeyDown(createKeyboardEvent('a', { ctrlKey: true, target: document.createElement('input') }));

    expect(runEffects).not.toHaveBeenCalled();
  });

  it('opens selected nodes through the provided node opener', () => {
    const openNode = vi.fn();
    let effects: GraphKeyboardEffect[] | undefined;
    let handlers: GraphKeyboardEffectHandlers | undefined;
    const handleKeyDown = createGraphKeyboardListener({
      dispatchStoreMessage: vi.fn(),
      fitView: vi.fn(),
      getAllNodeIds: () => ['a.ts'],
      graphMode: '2d',
      openNode,
      postMessage: vi.fn(),
      runEffects: (nextEffects, nextHandlers) => {
        effects = nextEffects;
        handlers = nextHandlers;
      },
      selectedNodeIds: ['a.ts', 'b.ts'],
      setSelection: vi.fn(),
      zoom2d: vi.fn(),
    });

    handleKeyDown(createKeyboardEvent('Enter'));

    expect(effects).toEqual([{ kind: 'openSelectedNodes', nodeIds: ['a.ts', 'b.ts'] }]);
    handlers?.openSelectedNodes(['a.ts', 'b.ts']);
    expect(openNode).toHaveBeenNthCalledWith(1, 'a.ts');
    expect(openNode).toHaveBeenNthCalledWith(2, 'b.ts');
  });
});

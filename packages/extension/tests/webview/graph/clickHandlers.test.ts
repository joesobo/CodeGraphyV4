import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../src/webview/components/graphModel';
import { createClickHandlers } from '../../../src/webview/components/graph/interactionHandlers/clickHandlers';
import { createInteractionDependencies } from './interactionHandlers.testUtils';

describe('graph/clickHandlers', () => {
  it('handles node clicks through the interaction model', () => {
    const dependencies = createInteractionDependencies();
    const applyGraphInteractionEffects = vi.fn();
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
    });

    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );

    expect(dependencies.lastClickRef.current).toEqual({
      nodeId: 'src/app.ts',
      time: expect.any(Number),
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(expect.any(Array), { event });
  });

  it('handles background and link clicks', () => {
    const dependencies = createInteractionDependencies();
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });
    const event = new MouseEvent('click');

    handlers.handleBackgroundClick();
    handlers.handleLinkClick(
      {
        id: 'src/app.ts->src/utils.ts',
        from: 'src/app.ts',
        to: 'src/utils.ts',
      } as FGLink,
      event,
    );

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(applyGraphInteractionEffects).toHaveBeenNthCalledWith(
      1,
      expect.any(Array),
    );
    expect(applyGraphInteractionEffects).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      { event, link: expect.objectContaining({ id: 'src/app.ts->src/utils.ts' }) },
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../src/webview/components/graphModel';
import { createClickHandlers } from '../../../src/webview/components/graph/interactions/click';
import { createInteractionDependencies } from './interactions/testUtils';

const interactionModelHarness = vi.hoisted(() => ({
  getBackgroundClickCommand: vi.fn(),
  getLinkClickCommand: vi.fn(),
  getNodeClickCommand: vi.fn(),
}));

vi.mock('../../../src/webview/components/graphInteraction/model', () => ({
  getBackgroundClickCommand: interactionModelHarness.getBackgroundClickCommand,
  getLinkClickCommand: interactionModelHarness.getLinkClickCommand,
  getNodeClickCommand: interactionModelHarness.getNodeClickCommand,
}));

describe('graph/clickHandlers', () => {
  afterEach(() => {
    interactionModelHarness.getBackgroundClickCommand.mockReset();
    interactionModelHarness.getLinkClickCommand.mockReset();
    interactionModelHarness.getNodeClickCommand.mockReset();
    vi.restoreAllMocks();
  });

  it('handles node clicks through the interaction model and stores the returned last-click state', () => {
    const dependencies = createInteractionDependencies({
      isMacPlatform: true,
      lastClickRef: { current: { nodeId: 'src/other.ts', time: 99 } },
      selectedNodesSetRef: { current: new Set(['src/app.ts', 'src/utils.ts']) },
    });
    const applyGraphInteractionEffects = vi.fn();
    const nextLastClick = { nodeId: 'src/app.ts', time: 1234 };
    const effects = [{ kind: 'previewNode', nodeId: 'src/app.ts' }];
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);
    interactionModelHarness.getNodeClickCommand.mockReturnValue({
      effects,
      nextLastClick,
    });
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    });
    const node = { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode;

    handlers.handleNodeClick(node, event);

    expect(nowSpy).toHaveBeenCalled();
    expect(interactionModelHarness.getNodeClickCommand).toHaveBeenCalledWith({
      clientX: 100,
      clientY: 200,
      ctrlKey: true,
      doubleClickThresholdMs: 450,
      isMacPlatform: true,
      label: 'app.ts',
      lastClick: { nodeId: 'src/other.ts', time: 99 },
      metaKey: true,
      nodeId: 'src/app.ts',
      now: 1234,
      selectedNodeIds: dependencies.selectedNodesSetRef.current,
      shiftKey: true,
    });
    expect(dependencies.lastClickRef.current).toEqual(nextLastClick);
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event });
  });

  it('handles an eventless background click with non-modifier defaults', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const effects = [{ kind: 'clearSelection' }];
    interactionModelHarness.getBackgroundClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });

    handlers.handleBackgroundClick();

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(interactionModelHarness.getBackgroundClickCommand).toHaveBeenCalledWith({
      ctrlKey: false,
      isMacPlatform: false,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects);
  });

  it('handles a background click event using the event modifier keys and platform flag', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const setGraphCursor = vi.fn();
    const effects = [{ kind: 'openBackgroundContextMenu' }];
    const event = new MouseEvent('click', { ctrlKey: true });
    interactionModelHarness.getBackgroundClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor,
    });

    handlers.handleBackgroundClick(event);

    expect(setGraphCursor).toHaveBeenCalledWith('default');
    expect(interactionModelHarness.getBackgroundClickCommand).toHaveBeenCalledWith({
      ctrlKey: true,
      isMacPlatform: true,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event });
  });

  it('handles link clicks through the interaction model with the clicked link and event', () => {
    const dependencies = createInteractionDependencies({ isMacPlatform: true });
    const applyGraphInteractionEffects = vi.fn();
    const link = {
      id: 'src/app.ts->src/utils.ts',
      from: 'src/app.ts',
      to: 'src/utils.ts',
    } as FGLink;
    const event = new MouseEvent('click', { ctrlKey: true });
    const effects = [{ kind: 'openEdgeContextMenu' }];
    interactionModelHarness.getLinkClickCommand.mockReturnValue(effects);
    const handlers = createClickHandlers(dependencies, {
      applyGraphInteractionEffects,
      setGraphCursor: vi.fn(),
    });

    handlers.handleLinkClick(link, event);

    expect(interactionModelHarness.getLinkClickCommand).toHaveBeenCalledWith({
      ctrlKey: true,
      isMacPlatform: true,
    });
    expect(applyGraphInteractionEffects).toHaveBeenCalledWith(effects, { event, link });
  });
});

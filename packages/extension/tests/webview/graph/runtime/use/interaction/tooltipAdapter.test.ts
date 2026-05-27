import { describe, expect, it, vi } from 'vitest';
import { buildTooltipInteractionHandlers } from '../../../../../../src/webview/components/graph/runtime/use/interaction/tooltipAdapter';

describe('graph/runtime/use/interaction tooltip adapter', () => {
  it('delegates tooltip interaction calls to graph interaction handlers', () => {
    const interactionHandlers = {
      sendGraphInteraction: vi.fn(),
      setGraphCursor: vi.fn(),
    };

    const tooltipHandlers = buildTooltipInteractionHandlers(interactionHandlers as never);
    tooltipHandlers.sendGraphInteraction('graph:nodeHover', { node: 'src/app.ts' });
    tooltipHandlers.setGraphCursor('pointer');

    expect(interactionHandlers.sendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', {
      node: 'src/app.ts',
    });
    expect(interactionHandlers.setGraphCursor).toHaveBeenCalledWith('pointer');
  });
});

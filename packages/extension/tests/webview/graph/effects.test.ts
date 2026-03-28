import { describe, expect, it, vi } from 'vitest';
import { createEffectHandlers } from '../../../src/webview/components/graph/interactions/effects';
import {
  clearSentMessages,
  findMessage,
  getSentMessages,
} from '../../helpers/sentMessages';
import { createInteractionDependencies } from './interactions/testUtils';

describe('graph/effectHandlers', () => {
  it('posts preview, open, and interaction messages', () => {
    clearSentMessages();
    const dependencies = createInteractionDependencies();
    const handlers = createEffectHandlers(dependencies, {
      clearSelection: vi.fn(),
      focusNodeById: vi.fn(),
      openBackgroundContextMenu: vi.fn(),
      openEdgeContextMenu: vi.fn(),
      openNodeContextMenu: vi.fn(),
      selectOnlyNode: vi.fn(),
      setSelection: vi.fn(),
    });

    handlers.previewNode('src/app.ts');
    handlers.requestNodeOpenById('src/app.ts');
    handlers.sendGraphInteraction('graph:nodeClick', { nodeId: 'src/app.ts' });

    expect(findMessage('NODE_SELECTED')?.payload.nodeId).toBe('src/app.ts');
    expect(findMessage('NODE_DOUBLE_CLICKED')?.payload.nodeId).toBe('src/app.ts');
    expect(
      getSentMessages().some(
        (message) =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:nodeClick',
      ),
    ).toBe(true);
  });

  it('routes interaction effects through the provided handlers', () => {
    const handlers = {
      clearSelection: vi.fn(),
      focusNodeById: vi.fn(),
      openBackgroundContextMenu: vi.fn(),
      openEdgeContextMenu: vi.fn(),
      openNodeContextMenu: vi.fn(),
      selectOnlyNode: vi.fn(),
      setSelection: vi.fn(),
    };
    const effectHandlers = createEffectHandlers(
      createInteractionDependencies(),
      handlers,
    );

    effectHandlers.applyGraphInteractionEffects([
      { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
      { kind: 'focusNode', nodeId: 'src/app.ts' },
      { kind: 'clearSelection' },
    ]);

    expect(handlers.selectOnlyNode).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.focusNodeById).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.clearSelection).toHaveBeenCalledOnce();
  });
});

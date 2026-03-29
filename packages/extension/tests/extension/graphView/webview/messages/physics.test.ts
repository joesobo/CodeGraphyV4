import { describe, expect, it, vi } from 'vitest';
import {
  applyPhysicsMessage,
  type GraphViewPhysicsMessageHandlers,
} from '../../../../../src/extension/graphView/webview/messages/physics';

function createHandlers(
  overrides: Partial<GraphViewPhysicsMessageHandlers> = {},
): GraphViewPhysicsMessageHandlers {
  return {
    sendPhysicsSettings: vi.fn(),
    updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view physics message', () => {
  it('sends current physics settings on request', async () => {
    const handlers = createHandlers();

    await expect(applyPhysicsMessage({ type: 'GET_PHYSICS_SETTINGS' }, handlers)).resolves.toBe(
      true,
    );

    expect(handlers.sendPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('updates a single physics setting', async () => {
    const handlers = createHandlers();

    await expect(
      applyPhysicsMessage(
        {
          type: 'UPDATE_PHYSICS_SETTING',
          payload: { key: 'repelForce', value: 12 },
        },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updatePhysicsSetting).toHaveBeenCalledWith('repelForce', 12);
  });

  it('resets physics settings to defaults', async () => {
    const handlers = createHandlers();

    await expect(applyPhysicsMessage({ type: 'RESET_PHYSICS_SETTINGS' }, handlers)).resolves.toBe(
      true,
    );

    expect(handlers.resetPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    await expect(
      applyPhysicsMessage(
        { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
        handlers,
      ),
    ).resolves.toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRegistry, createMockView } from './testUtils';

describe('ViewRegistry logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs on register with view name and id', () => {
    const registry = createRegistry();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const view = createMockView({ id: 'my.view', name: 'My View' });

    registry.register(view);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Registered view: My View (my.view)',
    );
  });

  it('logs on successful unregister with view id', () => {
    const registry = createRegistry();
    const view = createMockView({ id: 'log.test' });

    registry.register(view);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.unregister('log.test');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Unregistered view: log.test',
    );
  });

  it('does not log on unsuccessful unregister', () => {
    const registry = createRegistry();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    registry.unregister('does.not.exist');

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

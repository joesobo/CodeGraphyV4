import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  clearTimeoutMap,
  createGroupPersistenceHandlers,
} from '../../../../../src/webview/components/settingsPanel/groups/shared/persistence';

function createOverrideSetter(initialValue: Record<string, string> = {}) {
  let value = initialValue;
  const setter = (next: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => {
    value = typeof next === 'function' ? next(value) : next;
  };

  return {
    get value() {
      return value;
    },
    setter,
  };
}

describe('settingsPanel groups persistence', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('clears all pending timers from a timeout map', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const ref = {
      current: {
        first: setTimeout(() => undefined, 100),
        second: setTimeout(() => undefined, 200),
      },
    } as unknown as Parameters<typeof clearTimeoutMap>[0];

    clearTimeoutMap(ref);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('ignores empty timer entries when clearing a timeout map', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const ref = {
      current: {
        first: setTimeout(() => undefined, 100),
        second: undefined,
      },
    } as unknown as Parameters<typeof clearTimeoutMap>[0];

    clearTimeoutMap(ref);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('does not clear a timer before scheduling the first override', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup: vi.fn(),
      patternDebounceRef: { current: {} },
      previewGroupUpdate: vi.fn(),
      setOptimisticGroupUpdate: vi.fn(),
      setLocalColorOverrides: createOverrideSetter().setter,
      setLocalPatternOverrides: createOverrideSetter().setter,
      updateGroup: vi.fn(),
    });

    handlers.changeGroupColor('g1', '#ff00ff');

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('persists debounced custom color changes and clears the local override', () => {
    vi.useFakeTimers();
    const colorOverrides = createOverrideSetter();
    const patternOverrides = createOverrideSetter();
    const updateGroup = vi.fn();
    const setOptimisticGroupUpdate = vi.fn();
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup: vi.fn(),
      patternDebounceRef: { current: {} },
      previewGroupUpdate: vi.fn(),
      setOptimisticGroupUpdate,
      setLocalColorOverrides: colorOverrides.setter,
      setLocalPatternOverrides: patternOverrides.setter,
      updateGroup,
    });

    handlers.changeGroupColor('g1', '#ff00ff');
    expect(colorOverrides.value).toEqual({ g1: '#ff00ff' });

    vi.advanceTimersByTime(300);

    expect(setOptimisticGroupUpdate).toHaveBeenCalledWith('g1', { color: '#ff00ff' });
    expect(updateGroup).toHaveBeenCalledWith('g1', { color: '#ff00ff' });
    expect(colorOverrides.value).toEqual({});
  });

  it('replaces a pending custom color timer and preserves sibling overrides', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const colorOverrides = createOverrideSetter({ preserved: '#123456' });
    const updateGroup = vi.fn();
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup: vi.fn(),
      patternDebounceRef: { current: {} },
      previewGroupUpdate: vi.fn(),
      setOptimisticGroupUpdate: vi.fn(),
      setLocalColorOverrides: colorOverrides.setter,
      setLocalPatternOverrides: createOverrideSetter().setter,
      updateGroup,
    });

    handlers.changeGroupColor('g1', '#ff00ff');
    handlers.changeGroupColor('g1', '#00ff00');
    vi.advanceTimersByTime(300);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(updateGroup).toHaveBeenCalledTimes(1);
    expect(updateGroup).toHaveBeenCalledWith('g1', { color: '#00ff00' });
    expect(colorOverrides.value).toEqual({ preserved: '#123456' });
  });

  it('persists debounced plugin color overrides and clears the local override', () => {
    vi.useFakeTimers();
    const overridePluginGroup = vi.fn();
    const colorOverrides = createOverrideSetter();
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup,
      patternDebounceRef: { current: {} },
      previewGroupUpdate: vi.fn(),
      setOptimisticGroupUpdate: vi.fn(),
      setLocalColorOverrides: colorOverrides.setter,
      setLocalPatternOverrides: createOverrideSetter().setter,
      updateGroup: vi.fn(),
    });

    handlers.changePluginGroupColor(
      {
        id: 'plugin:typescript:ts',
        pattern: '*.ts',
        color: '#3178C6',
        isPluginDefault: true,
      } as IGroup,
      '#00ff00',
    );
    expect(colorOverrides.value).toEqual({ 'plugin:typescript:ts': '#00ff00' });

    vi.advanceTimersByTime(300);

    expect(overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { color: '#00ff00' },
    );
    expect(colorOverrides.value).toEqual({});
  });

  it('persists debounced pattern changes and keeps only the latest pending value', () => {
    vi.useFakeTimers();
    const patternOverrides = createOverrideSetter();
    const updateGroup = vi.fn();
    const setOptimisticGroupUpdate = vi.fn();
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup: vi.fn(),
      patternDebounceRef: { current: {} },
      previewGroupUpdate: vi.fn(),
      setOptimisticGroupUpdate,
      setLocalColorOverrides: createOverrideSetter().setter,
      setLocalPatternOverrides: patternOverrides.setter,
      updateGroup,
    });

    handlers.changeGroupPattern('g1', '*.tsx');
    handlers.changeGroupPattern('g1', '*.cts');

    vi.advanceTimersByTime(300);

    expect(setOptimisticGroupUpdate).toHaveBeenNthCalledWith(1, 'g1', { pattern: '*.tsx' });
    expect(setOptimisticGroupUpdate).toHaveBeenNthCalledWith(2, 'g1', { pattern: '*.cts' });
    expect(updateGroup).toHaveBeenCalledTimes(1);
    expect(updateGroup).toHaveBeenCalledWith('g1', { pattern: '*.cts' });
    expect(patternOverrides.value).toEqual({});
  });

  it('previews custom group changes immediately before persistence completes', () => {
    vi.useFakeTimers();
    const previewGroupUpdate = vi.fn();
    const setOptimisticGroupUpdate = vi.fn();
    const handlers = createGroupPersistenceHandlers({
      colorDebounceRef: { current: {} },
      overridePluginGroup: vi.fn(),
      patternDebounceRef: { current: {} },
      previewGroupUpdate,
      setOptimisticGroupUpdate,
      setLocalColorOverrides: createOverrideSetter().setter,
      setLocalPatternOverrides: createOverrideSetter().setter,
      updateGroup: vi.fn(),
    });

    handlers.changeGroupPattern('g1', '*.tsx');
    handlers.changeGroupColor('g1', '#ff00ff');

    expect(previewGroupUpdate).toHaveBeenNthCalledWith(1, 'g1', { pattern: '*.tsx' });
    expect(previewGroupUpdate).toHaveBeenNthCalledWith(2, 'g1', { color: '#ff00ff' });
    expect(setOptimisticGroupUpdate).toHaveBeenNthCalledWith(1, 'g1', { pattern: '*.tsx' });
    expect(setOptimisticGroupUpdate).toHaveBeenNthCalledWith(2, 'g1', { color: '#ff00ff' });
  });
});

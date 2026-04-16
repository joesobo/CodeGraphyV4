import { describe, expect, it, vi } from 'vitest';
import type { DirectionMode } from '@/shared/settings/modes';
import {
  applySettingsDirectionMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/direction';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: new Set<string>(),
    filterPatterns: [],
    ...overrides,
  };
}

function createHandlers(
  initialConfig: Record<string, unknown> = {},
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
  const config = new Map<string, unknown>([
    ['directionMode', 'arrows'],
    ['particleSpeed', 0.005],
    ['particleSize', 4],
    ['directionColor', '#475569'],
    ...Object.entries(initialConfig),
  ]);

  const handlers = {
    getConfig: vi.fn(<T>(key: string, defaultValue: T): T =>
      config.has(key) ? (config.get(key) as T) : defaultValue,
    ),
    updateConfig: vi.fn((key: string, value: unknown) => {
      config.set(key, value);
      return Promise.resolve();
    }),
    getPluginFilterPatterns: vi.fn(() => []),
    sendGraphControls: vi.fn(),
    sendMessage: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}

describe('graph view settings direction message', () => {
  it('updates direction mode and publishes the full direction payload', async () => {
    const state = createState();
    const handlers = createHandlers({
      particleSpeed: 0.1,
      particleSize: 8,
      directionColor: 'bad-color',
    });

    await expect(applySettingsDirectionMessage(
      { type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: 'particles' } },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('directionMode', 'particles');
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'particles',
        particleSpeed: 0.1,
        particleSize: 8,
        directionColor: '#475569',
      },
    });
  });

  it('normalizes direction color updates before persisting them', async () => {
    const state = createState();
    const handlers = createHandlers({
      directionMode: 'none' satisfies DirectionMode,
      particleSpeed: 0.2,
      particleSize: 6,
    });

    await expect(applySettingsDirectionMessage(
      { type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: '  #aa00cc ' } },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('directionColor', '#AA00CC');
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'none',
        particleSpeed: 0.2,
        particleSize: 6,
        directionColor: '#AA00CC',
      },
    });
  });

  it('uses the default direction mode and default direction color when config values are absent', async () => {
    const handlers = createHandlers({}, {
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'directionMode' || key === 'directionColor') {
          return defaultValue;
        }
        return defaultValue;
      }),
    });

    await applySettingsDirectionMessage(
      { type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: 'bad-color' } },
      createState(),
      handlers,
    );

    expect(handlers.getConfig).toHaveBeenCalledWith('directionMode', 'arrows');
    expect(handlers.getConfig).toHaveBeenCalledWith('directionColor', '#475569');
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'arrows',
        particleSpeed: 0.005,
        particleSize: 4,
        directionColor: '#475569',
      },
    });
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsDirectionMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: 42 } }, state, handlers),
    ).resolves.toBe(false);
  });
});

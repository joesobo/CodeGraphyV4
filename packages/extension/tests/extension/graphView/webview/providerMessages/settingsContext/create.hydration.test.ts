import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

describe('graph view provider listener settings context hydration', () => {
  it('delegates graph scope hydration when the provider exposes cached hydration', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    const hydrateGraphScope = vi.fn(() => Promise.resolve(true));

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
        hydrateGraphScope,
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await expect(context.hydrateGraphScope()).resolves.toBe(true);

    expect(hydrateGraphScope).toHaveBeenCalledOnce();
  });

  it('reports cache hydration unavailable when the provider cannot hydrate graph scope', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const context = createGraphViewProviderMessageSettingsContext(
      {
        _context: { workspaceState: { update: vi.fn(() => Promise.resolve()) } },
        _nodeSizeMode: 'connections',
        _getPhysicsSettings: vi.fn(() => ({
          repelForce: 1,
          linkDistance: 2,
          linkForce: 3,
          damping: 4,
          centerForce: 5,
        })),
        _sendMessage: vi.fn(),
        _sendAllSettings: vi.fn(),
        _analyzeAndSendData: vi.fn(() => Promise.resolve()),
      } as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
        captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
        createResetSettingsAction: vi.fn(),
        executeUndoAction: vi.fn(() => Promise.resolve()),
        nodeSizeModeKey: 'nodeSizeMode',
      } as never,
    );

    await expect(context.hydrateGraphScope()).resolves.toBe(false);
  });

});

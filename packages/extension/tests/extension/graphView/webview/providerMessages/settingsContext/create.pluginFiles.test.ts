import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessageSettingsContext,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create';
import * as repoSettings from '../../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

describe('graph view provider listener settings context plugin files', () => {
  it('reprocesses only invalidated plugin files when the pipeline reports affected files', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => ['src/a.ts', 'src/b.ts']);

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
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
        invalidatePluginFiles,
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

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(refreshChangedFiles).toHaveBeenCalledWith(['src/a.ts', 'src/b.ts']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('skips reanalysis when plugin invalidation reports no affected files', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const invalidatePluginFiles = vi.fn(() => []);

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
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
        invalidatePluginFiles,
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

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to full reanalysis when plugin invalidation is unavailable', async () => {
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);

    const refreshChangedFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());

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
        _analyzeAndSendData: analyzeAndSendData,
        refreshChangedFiles,
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

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(refreshChangedFiles).not.toHaveBeenCalled();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

});

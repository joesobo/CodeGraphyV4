import { describe, expect, it, vi } from 'vitest';
import { updateHiddenPluginGroups } from '../../../../../src/extension/graphView/webview/providerMessages/hiddenPluginGroups';

describe('graphView/webview/providerMessages/hiddenPluginGroups', () => {
  it('updates the hidden plugin group setting using the resolved config target', async () => {
    const update = vi.fn(() => Promise.resolve());
    const getConfiguration = vi.fn(() => ({ update }));
    const workspaceFolders = [{ name: 'workspace', index: 0, uri: { fsPath: '/workspace' } }];
    const getConfigTarget = vi.fn(() => true);

    await updateHiddenPluginGroups(
      {
        workspace: {
          workspaceFolders,
          getConfiguration,
        },
        getConfigTarget,
      } as never,
      ['plugin.one', 'plugin.two'],
    );

    expect(getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
    expect(update).toHaveBeenCalledWith(
      'hiddenPluginGroups',
      ['plugin.one', 'plugin.two'],
      true,
    );
  });
});

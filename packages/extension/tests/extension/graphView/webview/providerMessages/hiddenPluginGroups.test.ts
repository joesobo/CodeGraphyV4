import { describe, expect, it, vi } from 'vitest';
import { updateHiddenPluginGroups } from '../../../../../src/extension/graphView/webview/providerMessages/hiddenPluginGroups';
import * as repoSettings from '../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
}));

describe('graphView/webview/providerMessages/hiddenPluginGroups', () => {
  it('updates the hidden plugin group setting in repo-local settings', async () => {
    const update = vi.fn(() => Promise.resolve());
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      update,
    } as never);

    await updateHiddenPluginGroups(
      {} as never,
      ['plugin.one', 'plugin.two'],
    );

    expect(update).toHaveBeenCalledWith(
      'hiddenPluginGroups',
      ['plugin.one', 'plugin.two'],
    );
  });
});

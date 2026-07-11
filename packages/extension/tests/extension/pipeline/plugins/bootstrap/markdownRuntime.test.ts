import { afterEach, describe, expect, it, vi } from 'vitest';

describe('pipeline/plugins/bootstrap Markdown runtime loading', () => {
  afterEach(() => {
    vi.doUnmock('@codegraphy-dev/plugin-markdown');
    vi.doUnmock('../../../../../../plugin-markdown/src/plugin');
    vi.resetModules();
  });

  it('does not import the Markdown runtime when Plugin Activity State disables Markdown', async () => {
    vi.resetModules();
    const failIfImported = () => {
      throw new Error('Markdown runtime was imported');
    };
    vi.doMock('@codegraphy-dev/plugin-markdown', failIfImported);
    vi.doMock('../../../../../../plugin-markdown/src/plugin', failIfImported);

    const { getBuiltInWorkspacePipelinePluginRegistrations } = await import(
      '../../../../../src/extension/pipeline/plugins/bootstrap/builtIns'
    );

    await expect(getBuiltInWorkspacePipelinePluginRegistrations(
      {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        respectFilesExclude: true,
        showOrphans: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: 'codegraphy.markdown', enabled: true }],
        pluginData: {},
      },
      ['codegraphy.markdown'],
    )).resolves.toEqual([]);
  });
});

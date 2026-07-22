import { describe, expect, it } from 'vitest';
import {
  getBuiltInWorkspacePipelinePluginRegistrations,
} from '../../../../../src/extension/pipeline/plugins/bootstrap/builtIns';

describe('pipeline/plugins/bootstrap Markdown runtime loading', () => {
  it('does not register Markdown when Plugin Activity State disables it', async () => {
    await expect(getBuiltInWorkspacePipelinePluginRegistrations(
      {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: 'codegraphy.markdown', activation: 'enabled' }],
        interfaces: [],
        pluginData: {},
      },
      ['codegraphy.markdown'],
    )).resolves.toEqual([]);
  });
});

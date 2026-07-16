import { describe, expect, it } from 'vitest';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
} from './bootstrapFixture';

describe('pipeline/plugins/bootstrap filters', () => {
  it('collects unique plugin filter patterns and skips plugins without defaults', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns({
        list: () => [
          { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
          { plugin: {} },
          { plugin: { id: 'plugin.disabled', defaultFilters: ['**/*.generated.ts'] } },
        ] as Array<{ plugin: { id?: string; defaultFilters?: string[] } }>,
      }),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('skips default filter patterns contributed by disabled plugins', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns(
        {
          list: () => [
            { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
            { plugin: { id: 'plugin.disabled', defaultFilters: ['venv/**', '**/*.generated.ts'] } },
          ],
        },
        new Set(['plugin.disabled']),
      ),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('groups plugin filter patterns by plugin name and de-duplicates each plugin list', () => {
    expect(
      getWorkspacePipelinePluginFilterGroups(
        {
          list: () => [
            {
              plugin: {
                id: 'plugin.enabled',
                name: 'Enabled Plugin',
                defaultFilters: ['**/*.generated.ts', '**/*.generated.ts'],
              },
            },
            { plugin: { id: 'plugin.empty', name: 'Empty Plugin', defaultFilters: [] } },
            { plugin: { id: 'plugin.no-filters', name: 'No Filters Plugin' } },
            { plugin: { name: 'Fallback Name', defaultFilters: ['dist/**'] } },
            { plugin: { defaultFilters: ['cache/**'] } },
          ],
        },
      ),
    ).toEqual([
      {
        pluginId: 'plugin.enabled',
        pluginName: 'Enabled Plugin',
        patterns: ['**/*.generated.ts'],
      },
      {
        pluginId: 'Fallback Name',
        pluginName: 'Fallback Name',
        patterns: ['dist/**'],
      },
      {
        pluginId: 'plugin',
        pluginName: 'Plugin',
        patterns: ['cache/**'],
      },
    ]);
  });

  it('omits grouped filters from disabled plugins', () => {
    expect(
      getWorkspacePipelinePluginFilterGroups(
        {
          list: () => [
            { plugin: { id: 'plugin.enabled', name: 'Enabled Plugin', defaultFilters: ['src/**'] } },
            { plugin: { id: 'plugin.disabled', name: 'Disabled Plugin', defaultFilters: ['dist/**'] } },
          ],
        },
        new Set(['plugin.disabled']),
      ),
    ).toEqual([
      {
        pluginId: 'plugin.enabled',
        pluginName: 'Enabled Plugin',
        patterns: ['src/**'],
      },
    ]);
  });
});

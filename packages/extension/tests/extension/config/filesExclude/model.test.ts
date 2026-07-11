import { describe, expect, it, vi } from 'vitest';
import {
  normalizeFilesExcludeRules,
  readFilesExcludeRules,
} from '../../../../src/extension/config/filesExclude/model';

describe('config/filesExclude/model', () => {
  it('normalizes enabled and conditional rules in stable pattern order', () => {
    expect(normalizeFilesExcludeRules({
      '**/*.js': { when: '$(basename).ts' },
      '**/generated': true,
      '**/*.map': false,
    })).toEqual([
      { pattern: '**/*.js', when: '$(basename).ts' },
      { pattern: '**/generated' },
    ]);
  });

  it('ignores malformed and empty configuration entries', () => {
    expect(normalizeFilesExcludeRules({
      '': true,
      '**/*.tmp': { when: '' },
      '**/*.log': 'yes',
    })).toEqual([]);
  });

  it('reads files.exclude for the selected workspace-folder resource', () => {
    const workspaceUri = { path: '/workspace' };
    const get = vi.fn(<T>(_key: string, _defaultValue: T): T => ({ '**/generated': true }) as T);
    const getConfiguration = vi.fn(() => ({ get }));

    expect(readFilesExcludeRules({ getConfiguration }, workspaceUri)).toEqual([
      { pattern: '**/generated' },
    ]);
    expect(getConfiguration).toHaveBeenCalledWith('files', workspaceUri);
    expect(get).toHaveBeenCalledWith('exclude', {});
  });
});

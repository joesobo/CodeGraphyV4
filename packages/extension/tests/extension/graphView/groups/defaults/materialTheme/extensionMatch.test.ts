import { describe, expect, it } from 'vitest';
import { findLongestExtensionMatch } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/extensionMatch';

describe('graphView/materialTheme/extensionMatch', () => {
  it('matches bare extension filenames', () => {
    expect(findLongestExtensionMatch('go', [['go', 'go']])).toEqual({
      iconName: 'go',
      key: 'go',
      kind: 'fileExtension',
    });
  });

  it('matches dotted suffixes case-insensitively', () => {
    expect(findLongestExtensionMatch('README.MARKDOWN', [['markdown', 'markdown']])).toEqual({
      iconName: 'markdown',
      key: 'MARKDOWN',
      kind: 'fileExtension',
    });
  });

  it('prefers the longest extension match', () => {
    expect(findLongestExtensionMatch('main.d.test.ts', [
      ['ts', 'typescript'],
      ['test.ts', 'test-typescript'],
      ['d.test.ts', 'definition-test'],
    ])).toEqual({
      iconName: 'definition-test',
      key: 'd.test.ts',
      kind: 'fileExtension',
    });
  });
});

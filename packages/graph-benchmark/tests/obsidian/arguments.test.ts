import { describe, expect, it } from 'vitest';

import { parseObsidianVaultArguments } from '../../src/obsidian/arguments';

describe('parseObsidianVaultArguments', () => {
  it('parses the fixture mirror command options', () => {
    expect(parseObsidianVaultArguments([
      '--fixture',
      '1k',
      '--seed',
      '42',
      '--output',
      '/tmp/codegraphy-vault',
    ])).toEqual({
      fixture: '1k',
      seed: 42,
      outputDirectory: '/tmp/codegraphy-vault',
    });
  });
});

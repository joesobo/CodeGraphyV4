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

  it('rejects missing option values', () => {
    expect(() => parseObsidianVaultArguments([
      '--fixture', '500',
      '--output', '--seed', '1',
    ])).toThrow('--output requires a value');
  });

  it.each(['-1', '1.5', '9007199254740992'])(
    'rejects invalid synthetic seed %s',
    (seed) => {
      expect(() => parseObsidianVaultArguments([
        '--fixture', '500',
        '--seed', seed,
        '--output', '/tmp/codegraphy-vault',
      ])).toThrow('--seed must be a non-negative integer');
    },
  );

  it('shares fixture validation and the default synthetic seed', () => {
    expect(parseObsidianVaultArguments([
      '--fixture', '500',
      '--output', '/tmp/codegraphy-vault',
    ])).toMatchObject({ fixture: '500', seed: 307 });
    expect(() => parseObsidianVaultArguments([
      '--fixture', 'unknown',
      '--output', '/tmp/codegraphy-vault',
    ])).toThrow('Unknown fixture: unknown');
  });
});

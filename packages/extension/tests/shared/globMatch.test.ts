import { describe, expect, it } from 'vitest';
import { globMatch, globToRegex } from '../../src/shared/globMatch';

describe('shared/globMatch', () => {
  it('matches basename patterns against nested paths', () => {
    expect(globMatch('src/player.gd', '*.gd')).toBe(true);
    expect(globMatch('src/player.ts', '*.gd')).toBe(false);
  });

  it('keeps single-star and double-star path semantics distinct', () => {
    expect(globMatch('packages/extension/src/main.ts', 'src/*')).toBe(true);
    expect(globMatch('packages/extension/src/deep/main.ts', 'src/*')).toBe(false);
    expect(globMatch('packages/extension/src/deep/main.ts', 'src/**')).toBe(true);
  });

  it('matches double-star slash patterns at zero or more nested folders', () => {
    expect(globMatch('scripts/player.gd', 'scripts/**/*.gd')).toBe(true);
    expect(globMatch('scripts/characters/player.gd', 'scripts/**/*.gd')).toBe(true);
    expect(globMatch('addons/player.gd', 'scripts/**/*.gd')).toBe(false);
  });

  it('escapes regex metacharacters in glob patterns', () => {
    expect(globMatch('src/types/api.d.ts', '*.d.ts')).toBe(true);
    expect(globMatch('src/types/apiXd.ts', '*.d.ts')).toBe(false);
    expect(globToRegex('*.d.ts')).toBeInstanceOf(RegExp);
  });
});

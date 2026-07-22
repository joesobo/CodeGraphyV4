import { describe, expect, it } from 'vitest';
import { toRepoRelativeGraphPath } from '../../src/graph/symbolPaths';

describe('core/graph/symbolPaths', () => {
  it('normalizes POSIX absolute paths relative to the workspace', () => {
    expect(toRepoRelativeGraphPath('/workspace/src/app.ts', '/workspace'))
      .toBe('src/app.ts');
  });

  it('normalizes Windows absolute paths independent of the host platform', () => {
    expect(toRepoRelativeGraphPath('C:\\workspace\\src\\app.ts', 'C:\\workspace'))
      .toBe('src/app.ts');
  });
});

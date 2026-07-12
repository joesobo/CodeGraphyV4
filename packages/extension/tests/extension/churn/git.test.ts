import { describe, expect, it } from 'vitest';
import { parseChurnLog } from '../../../src/extension/churn/git';

describe('parseChurnLog', () => {
  it('counts commits per current file, follows renames, and stops before creation', () => {
    const output = [
      '__CODEGRAPHY_COMMIT__',
      'M\tpackages/app/src/new.ts',
      'M\tpackages/app/src/new.ts',
      '__CODEGRAPHY_COMMIT__',
      'R100\tpackages/app/src/old.ts\tpackages/app/src/new.ts',
      '__CODEGRAPHY_COMMIT__',
      'M\tpackages/app/src/old.ts',
      '__CODEGRAPHY_COMMIT__',
      'A\tpackages/app/src/old.ts',
      '__CODEGRAPHY_COMMIT__',
      'M\tpackages/app/src/old.ts',
    ].join('\n');

    expect(parseChurnLog(output, ['src/new.ts'], 'packages/app/')).toEqual({
      'src/new.ts': 4,
    });
  });

  it('ignores historical paths outside the current graph', () => {
    expect(parseChurnLog(
      '__CODEGRAPHY_COMMIT__\nM\tdeleted.ts\nM\tcurrent.ts',
      ['current.ts'],
      '',
    )).toEqual({ 'current.ts': 1 });
  });
});

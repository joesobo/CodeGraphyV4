import { describe, expect, it } from 'vitest';
import {
  duplicateSetupExampleCount,
  duplicateSetupGroupSizes
} from '../../src/scrap/setupDuplicates';

describe('setupDuplicates', () => {
  it('counts repeated non-trivial setup groups and ignores single-line setup', () => {
    const groupSizes = duplicateSetupGroupSizes([
      { setupFingerprint: 'alpha', setupLineCount: 3 },
      { setupFingerprint: 'alpha', setupLineCount: 4 },
      { setupFingerprint: 'beta', setupLineCount: 1 },
      { setupFingerprint: undefined, setupLineCount: 0 }
    ]);

    expect(groupSizes).toEqual([2, 2, 0, 0]);
    expect(duplicateSetupExampleCount(groupSizes)).toBe(2);
  });
});

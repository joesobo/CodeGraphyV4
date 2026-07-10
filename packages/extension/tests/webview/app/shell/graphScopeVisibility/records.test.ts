import { describe, expect, it } from 'vitest';

import {
  stabilizeVisibilityRecord,
  visibilityRecordsMatch,
} from '../../../../../src/webview/app/shell/graphScopeVisibility/records';

describe('webview/app/shell/graphScopeVisibility/records', () => {
  it('matches records only when every scope value is equal', () => {
    expect(visibilityRecordsMatch(
      { file: true, folder: false },
      { file: true, folder: true },
    )).toBe(false);
  });

  it('rejects records with different scope counts', () => {
    expect(visibilityRecordsMatch({ file: true }, { file: true, folder: false })).toBe(false);
  });

  it('retains the current record for a semantic echo', () => {
    const current = { file: true };

    expect(stabilizeVisibilityRecord(current, { file: true })).toBe(current);
  });

  it('selects the incoming record for a semantic change', () => {
    const incoming = { file: false };

    expect(stabilizeVisibilityRecord({ file: true }, incoming)).toBe(incoming);
  });
});

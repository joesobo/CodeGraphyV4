import { describe, expect, it } from 'vitest';
import {
  isMissingFileError,
  isWorkspaceAnalysisAbortError,
} from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/errors';

describe('extension/pipeline/service/cachedGraphWarmup/errors', () => {
  it('detects only AbortError instances as workspace analysis aborts', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    expect(isWorkspaceAnalysisAbortError(abortError)).toBe(true);
    expect(isWorkspaceAnalysisAbortError(new Error('AbortError'))).toBe(false);
    expect(isWorkspaceAnalysisAbortError({ name: 'AbortError' })).toBe(false);
  });

  it('detects only Error instances with ENOENT codes as missing files', () => {
    const missingFileError = Object.assign(new Error('missing'), { code: 'ENOENT' });

    expect(isMissingFileError(missingFileError)).toBe(true);
    expect(isMissingFileError(Object.assign(new Error('missing'), { code: 'EACCES' }))).toBe(false);
    expect(isMissingFileError({ code: 'ENOENT' })).toBe(false);
  });
});

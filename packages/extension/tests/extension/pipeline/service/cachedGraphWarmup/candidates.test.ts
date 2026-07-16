import { describe, expect, it } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { isCachedGraphAnalysisWarmupCandidate } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/candidates';

function file(relativePath: string): IDiscoveredFile {
  return { absolutePath: `/workspace/${relativePath}`, relativePath } as IDiscoveredFile;
}

describe('extension/pipeline/service/cachedGraphWarmup/candidates', () => {
  it('keeps source files and rejects generated or tool-owned paths', () => {
    expect(isCachedGraphAnalysisWarmupCandidate(file('src/app.ts'))).toBe(true);
    expect(isCachedGraphAnalysisWarmupCandidate(file('dist/app.js'))).toBe(false);
    expect(isCachedGraphAnalysisWarmupCandidate(file('packages/core/.codegraphy/graph.sqlite'))).toBe(false);
    expect(isCachedGraphAnalysisWarmupCandidate(file('node_modules/pkg/index.js'))).toBe(false);
    expect(isCachedGraphAnalysisWarmupCandidate(file('src\\coverage\\report.ts'))).toBe(false);
  });
});

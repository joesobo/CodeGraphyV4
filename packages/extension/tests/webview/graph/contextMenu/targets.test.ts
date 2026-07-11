import { describe, expect, it } from 'vitest';
import {
  areOnlyPackageNodes,
  buildCopyRelativeLabel,
  buildOpenBlockLabel,
  isPackageNodeId,
} from '../../../../src/webview/components/graph/contextMenu/node/targets';

describe('graph/contextMenu/targets', () => {
  it('detects package nodes', () => {
    expect(isPackageNodeId('pkg:fs')).toBe(true);
    expect(isPackageNodeId('src/app.ts')).toBe(false);
  });

  it('detects all-package selections', () => {
    expect(areOnlyPackageNodes(['pkg:fs', 'pkg:path'])).toBe(true);
    expect(areOnlyPackageNodes(['pkg:fs', 'src/app.ts'])).toBe(false);
  });

  it('builds the open and copy labels from selection size', () => {
    expect(buildOpenBlockLabel(['src/app.ts'])).toBe('Open File');
    expect(buildOpenBlockLabel(['a.ts', 'b.ts'])).toBe('Open 2 Files');
    expect(buildCopyRelativeLabel(['src/app.ts'])).toBe('Copy Relative Path');
    expect(buildCopyRelativeLabel(['a.ts', 'b.ts'])).toBe('Copy Relative Paths');
  });
});

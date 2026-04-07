import { describe, expect, it } from 'vitest';
import {
  areOnlyPackageNodes,
  buildCopyRelativeLabel,
  buildOpenBlockLabel,
  isPackageNodeId,
  shouldShowAbsoluteCopy,
  shouldShowRevealInExplorer,
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

  it('shows reveal and absolute copy only for single non-timeline selections', () => {
    expect(shouldShowRevealInExplorer(['src/app.ts'], false)).toBe(true);
    expect(shouldShowRevealInExplorer(['src/app.ts'], true)).toBe(false);
    expect(shouldShowRevealInExplorer(['a.ts', 'b.ts'], false)).toBe(false);
    expect(shouldShowAbsoluteCopy(['src/app.ts'])).toBe(true);
    expect(shouldShowAbsoluteCopy(['a.ts', 'b.ts'])).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  areOnlyPackageNodes,
  buildCopyRelativeLabel,
  buildOpenBlockLabel,
  isPackageNodeId,
  shouldShowAbsoluteCopy,
  shouldShowRevealInExplorer,
} from '../../../../../src/webview/components/graph/contextMenu/node/targets';

describe('graph/contextMenu/node/targets', () => {
  it('detects package node ids and all-package selections', () => {
    expect(isPackageNodeId('pkg:fs')).toBe(true);
    expect(isPackageNodeId('src/app.ts')).toBe(false);
    expect(areOnlyPackageNodes(['pkg:fs', 'pkg:path'])).toBe(true);
    expect(areOnlyPackageNodes(['pkg:fs', 'src/app.ts'])).toBe(false);
  });

  it('builds multi-select labels for open and copy actions', () => {
    expect(buildOpenBlockLabel(['src/a.ts'])).toBe('Open File');
    expect(buildOpenBlockLabel(['src/a.ts', 'src/b.ts'])).toBe('Open 2 Files');
    expect(buildCopyRelativeLabel(['src/a.ts'])).toBe('Copy Relative Path');
    expect(buildCopyRelativeLabel(['src/a.ts', 'src/b.ts'])).toBe('Copy Relative Paths');
  });

  it('shows explorer and absolute-copy actions only for single-file selections outside the timeline', () => {
    expect(shouldShowRevealInExplorer(['src/a.ts'], false)).toBe(true);
    expect(shouldShowRevealInExplorer(['src/a.ts'], true)).toBe(false);
    expect(shouldShowRevealInExplorer(['src/a.ts', 'src/b.ts'], false)).toBe(false);
    expect(shouldShowAbsoluteCopy(['src/a.ts'])).toBe(true);
    expect(shouldShowAbsoluteCopy(['src/a.ts', 'src/b.ts'])).toBe(false);
  });
});

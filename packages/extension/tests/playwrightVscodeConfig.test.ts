import { describe, expect, it } from 'vitest';
import {
  resolvePlaywrightGrep,
  resolvePlaywrightGrepInvert,
} from '../playwright.vscode.config';

describe('VS Code Playwright config', () => {
  it('matches language slices by feature title even when scenario text does not use the old render phrase', () => {
    const grep = resolvePlaywrightGrep({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'examples',
      CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP: 'Pascal Example|Python Example|Vue Example',
    });

    expect(grep?.test('Pascal Example Pascal example renders file nodes and uses relationships')).toBe(true);
    expect(grep?.test('Python Example Python example renders file nodes and import relationships')).toBe(true);
    expect(grep?.test('Vue Example Vue example renders file nodes and import relationships')).toBe(true);
  });

  it('uses feature titles to classify the full language example suite', () => {
    const grep = resolvePlaywrightGrep({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'examples',
    });

    expect(grep?.test('TypeScript Example TypeScript example renders file and type-import relationships')).toBe(true);
    expect(grep?.test('Graph Scope Edge Types - Vue Imports edge type shows Vue component imports')).toBe(false);
  });

  it('excludes language example features from interaction slices', () => {
    const grepInvert = resolvePlaywrightGrepInvert({
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'interactions',
    });

    expect(grepInvert?.test('C++ Example C++ example renders file nodes and include relationships')).toBe(true);
    expect(grepInvert?.test('Graph Scope Edge Types - C++ Include edge type shows C++ include relationships')).toBe(false);
  });
});

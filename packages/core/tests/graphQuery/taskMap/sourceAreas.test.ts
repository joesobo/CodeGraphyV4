import { describe, expect, it } from 'vitest';
import { balanceTaskMapSourceAreas } from '../../../src/graphQuery/taskMap/sourceAreas';

function item(path: string, score: number) {
  return { file: { path }, lexicalScore: score, score };
}

describe('core/graphQuery task map source areas', () => {
  it('keeps root source Files in one area while separating deeper Extension and Webview areas', () => {
    const balanced = balanceTaskMapSourceAreas([
      item('src/a.ts', 10),
      item('src/b.ts', 9),
      item('packages/app/src/webview/app/target.ts', 8),
      item('packages/app/src/webview/app/second.ts', 7),
      item('packages/app/src/webview/components/view.ts', 6),
    ]);

    expect(balanced.map(entry => entry.file.path)).toEqual([
      'src/a.ts',
      'packages/app/src/webview/app/target.ts',
      'packages/app/src/webview/components/view.ts',
      'src/b.ts',
      'packages/app/src/webview/app/second.ts',
    ]);
  });
});

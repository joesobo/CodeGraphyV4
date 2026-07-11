import { describe, expect, it } from 'vitest';
import { collectWorkspaceProblems } from '../../../src/extension/nativeDecorations/problems';

describe('nativeDecorations/problems', () => {
  it('counts errors and warnings only for workspace files', () => {
    expect(collectWorkspaceProblems({
      diagnostics: [
        [{ fsPath: '/workspace/src/app.ts' }, [{ severity: 0 }, { severity: 1 }, { severity: 2 }]],
        [{ fsPath: '/outside/other.ts' }, [{ severity: 0 }]],
      ],
      workspaceRoots: ['/workspace'],
    })).toEqual(new Map([
      ['/workspace/src/app.ts', { errors: 1, warnings: 1 }],
    ]));
  });
});

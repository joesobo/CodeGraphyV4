import { describe, expect, it } from 'vitest';
import {
  createInlineCreateSession,
  createInlineRenameSession,
  planInlineFileEdit,
} from '../../../../src/webview/components/graph/inlineEdit/model';

describe('graph inline edit model', () => {
  it('selects a file name without its extension when rename begins', () => {
    expect(createInlineRenameSession('src/app.test.ts')).toEqual({
      kind: 'rename',
      anchorNodeId: 'src/app.test.ts',
      directory: 'src',
      originalPath: 'src/app.test.ts',
      selection: [0, 8],
      value: 'app.test.ts',
      error: null,
      pending: false,
    });
  });

  it('creates an empty file session anchored to the target directory', () => {
    expect(createInlineCreateSession('file', 'src')).toEqual({
      kind: 'createFile',
      anchorNodeId: 'src',
      directory: 'src',
      selection: [0, 0],
      value: '',
      error: null,
      pending: false,
    });
  });

  it('keeps invalid rename input in the editor with a local error', () => {
    expect(planInlineFileEdit(createInlineRenameSession('src/app.ts'), '../app.ts')).toEqual({
      kind: 'invalid',
      message: 'Enter a file name without folder separators.',
    });
  });

  it('builds a committed nested file path from a relative child path', () => {
    expect(planInlineFileEdit(createInlineCreateSession('file', 'src'), 'feature/view.tsx')).toEqual({
      kind: 'commit',
      message: {
        type: 'CREATE_FILE',
        payload: { directory: 'src', name: 'feature/view.tsx' },
      },
    });
  });
});

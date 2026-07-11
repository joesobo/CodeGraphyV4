import { describe, expect, it } from 'vitest';
import {
  createGraphViewRenameInput,
  planGraphViewRename,
} from '../../../../../src/extension/graphView/files/rename/model';

describe('graphView/files/rename/model', () => {
  it('selects a filename without its extension', () => {
    expect(createGraphViewRenameInput('src/original.ts')).toEqual({
      selection: [0, 8],
      value: 'original.ts',
    });
  });

  it('selects the complete hidden filename', () => {
    expect(createGraphViewRenameInput('src/.env')).toEqual({
      selection: [0, 4],
      value: '.env',
    });
  });

  it('plans a sibling rename', () => {
    expect(planGraphViewRename('src/original.ts', 'renamed.ts')).toEqual({
      kind: 'rename',
      newPath: 'src/renamed.ts',
    });
  });

  it('rejects a path that escapes the inline filename field', () => {
    expect(planGraphViewRename('src/original.ts', '../outside.ts')).toEqual({
      kind: 'invalid',
      message: 'The name **../outside.ts** is not valid as a file or folder name. Please choose a different name.',
    });
  });
});

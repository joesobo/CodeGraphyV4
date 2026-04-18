import { describe, expect, it } from 'vitest';
import {
  registerEditorChangeHandler,
} from '../../../src/extension/workspaceFiles/editorSync';
import {
  registerFileWatcher,
  registerSaveHandler,
} from '../../../src/extension/workspaceFiles/refresh/watchers';

describe('extension/workspaceFiles/register', () => {
  it('re-exports the workspace listener entrypoints', () => {
    expect(registerEditorChangeHandler).toEqual(expect.any(Function));
    expect(registerSaveHandler).toEqual(expect.any(Function));
    expect(registerFileWatcher).toEqual(expect.any(Function));
  });
});

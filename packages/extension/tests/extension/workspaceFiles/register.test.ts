import { describe, expect, it } from 'vitest';
import {
  registerEditorChangeHandler,
  registerFileWatcher,
  registerSaveHandler,
} from '../../../src/extension/workspaceFiles/register';

describe('extension/workspaceFiles/register', () => {
  it('re-exports the workspace listener entrypoints', () => {
    expect(registerEditorChangeHandler).toEqual(expect.any(Function));
    expect(registerSaveHandler).toEqual(expect.any(Function));
    expect(registerFileWatcher).toEqual(expect.any(Function));
  });
});

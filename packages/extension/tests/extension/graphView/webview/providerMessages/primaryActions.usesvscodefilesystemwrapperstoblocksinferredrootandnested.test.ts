import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  createActions,
  createSource,
} from './primaryActions.fixture';

vi.mock('../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

describe('graph view provider listener primary actions', () => {

    afterEach(() => {
      vi.restoreAllMocks();
    });



    it('uses vscode file system wrappers for directory and file copies', async () => {
      const source = createSource();
      const actions = createActions(source);
      const originalFs = (vscode.workspace as { fs?: unknown }).fs;
      const createDirectory = vi.fn(() => Promise.resolve());
      const copy = vi.fn(() => Promise.resolve());
      const directoryUri = vscode.Uri.file('/workspace/assets');
      const sourceUri = vscode.Uri.file('/workspace/src/app.ts');
      const destinationUri = vscode.Uri.file('/workspace/src/app-copy.ts');

      Object.defineProperty(vscode.workspace, 'fs', {
        configurable: true,
        value: {
          createDirectory,
          copy,
        },
      });

      await actions.createDirectory(directoryUri);
      await actions.copyFile(sourceUri, destinationUri, { overwrite: true });

      expect(createDirectory).toHaveBeenCalledWith(directoryUri);
      expect(copy).toHaveBeenCalledWith(sourceUri, destinationUri, { overwrite: true });

      Object.defineProperty(vscode.workspace, 'fs', {
        configurable: true,
        value: originalFs,
      });
    });



    it('delegates provider messaging, grouping, and view actions', () => {
      const source = createSource();
      const actions = createActions(source);
      const message = { type: 'PING' };

      actions.recomputeGroups();
      actions.sendGroupsUpdated();
      actions.sendMessage(message as never);
      actions.applyViewTransform();
      actions.smartRebuild('plugin.test');

      expect(source._computeMergedGroups).toHaveBeenCalledOnce();
      expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
      expect(source._sendMessage).toHaveBeenCalledWith(message);
      expect(source._applyViewTransform).toHaveBeenCalledOnce();
      expect(source._smartRebuild).toHaveBeenCalledWith('plugin.test');
    });



    it('allows opening concrete file nodes and blocks explicit folder or package nodes', () => {
      const source = createSource({
        _graphData: {
          nodes: [
            { id: 'src/app.ts', nodeType: 'file' },
            { id: 'src', nodeType: 'folder' },
            { id: 'pkg:react', nodeType: 'package' },
          ],
          edges: [],
        },
      });
      const actions = createActions(source);

      expect(actions.canOpenPath('src/app.ts')).toBe(true);
      expect(actions.canOpenPath('src')).toBe(false);
      expect(actions.canOpenPath('pkg:react')).toBe(false);
    });



    it('blocks inferred root and nested folder paths when no explicit node exists', () => {
      const source = createSource({
        _graphData: {
          nodes: [
            { id: 'README.md', nodeType: 'file' },
            { id: 'src/app.ts', nodeType: 'file' },
          ],
          edges: [],
        },
      });
      const actions = createActions(source);

      expect(actions.canOpenPath('(root)')).toBe(false);
      expect(actions.canOpenPath('src')).toBe(false);
      expect(actions.canOpenPath('docs')).toBe(true);
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as repoSettings from '../../../../../src/extension/repoSettings/current';
import {
  createActions,
  createDependencies,
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



    it('delegates file-oriented provider actions', async () => {
      const source = createSource();
      const actions = createActions(source);

      await actions.openSelectedNode('src/app.ts');
      await actions.activateNode('src/app.ts');
      actions.setFocusedFile('src/app.ts');
      await actions.previewFileAtCommit('sha-1', 'src/app.ts');
      await actions.openFile('src/app.ts');
      await actions.revealInExplorer('src/app.ts');
      await actions.copyToClipboard('src/app.ts');
      await actions.deleteFiles(['src/app.ts']);
      await actions.renameFile('src/app.ts');
      await actions.createFile('src');
      await actions.createFolder('src');
      await actions.toggleFavorites(['src/app.ts']);
      await actions.addToExclude(['dist/**']);
      await actions.getFileInfo('src/app.ts');

      expect(source._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
      expect(source._activateNode).toHaveBeenCalledWith('src/app.ts');
      expect(source.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
      expect(source._previewFileAtCommit).toHaveBeenCalledWith('sha-1', 'src/app.ts');
      expect(source._openFile).toHaveBeenCalledWith('src/app.ts');
      expect(source._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
      expect(source._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
      expect(source._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
      expect(source._renameFile).toHaveBeenCalledWith('src/app.ts');
      expect(source._createFile).toHaveBeenCalledWith('src');
      expect(source._createFolder).toHaveBeenCalledWith('src');
      expect(source._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
      expect(source._addToExclude).toHaveBeenCalledWith(['dist/**']);
      expect(source._getFileInfo).toHaveBeenCalledWith('src/app.ts');
    });



    it('maps the synthetic root folder node to the workspace root for creation actions', async () => {
      const source = createSource();
      const actions = createActions(source);

      await actions.createFile('(root)');
      await actions.createFolder('(root)');

      expect(source._createFile).toHaveBeenCalledWith('.');
      expect(source._createFolder).toHaveBeenCalledWith('.');
    });



    it('delegates provider state and timeline actions', async () => {
      const source = createSource();
      const actions = createActions(source);

      await actions.loadAndSendData();
      await actions.indexAndSendData();
      await actions.analyzeAndSendData();
      await actions.refreshIndex();
      await actions.clearCacheAndRefresh();
      await actions.undo();
      await actions.redo();
      await actions.setDepthMode(true);
      await actions.setDepthLimit(4);
      await actions.indexRepository();
      await actions.jumpToCommit('sha-1');
      await actions.resetTimeline();
      actions.sendPhysicsSettings();
      await actions.updatePhysicsSetting('damping', 300);
      await actions.resetPhysicsSettings();

      expect(source._loadAndSendData).toHaveBeenCalledOnce();
      expect(source._indexAndSendData).toHaveBeenCalledOnce();
      expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
      expect(source.refreshIndex).toHaveBeenCalledOnce();
      expect(source.clearCacheAndRefresh).toHaveBeenCalledOnce();
      expect(source.undo).toHaveBeenCalledOnce();
      expect(source.redo).toHaveBeenCalledOnce();
      expect(source.setDepthMode).toHaveBeenCalledWith(true);
      expect(source.setDepthLimit).toHaveBeenCalledWith(4);
      expect(source._indexRepository).toHaveBeenCalledOnce();
      expect(source._jumpToCommit).toHaveBeenCalledWith('sha-1');
      expect(source._resetTimeline).toHaveBeenCalledOnce();
      expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
      expect(source._updatePhysicsSetting).toHaveBeenCalledWith('damping', 300);
      expect(source._resetPhysicsSettings).toHaveBeenCalledOnce();
    });



    it('uses dependency-backed wrappers for group persistence and dialogs', async () => {
      const source = createSource();
      const dependencies = createDependencies();
      const updateSilently = vi.fn(() => Promise.resolve());
      vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string, defaultValue: unknown) =>
          key === 'legendVisibility'
            ? {
                existing: true,
              }
            : defaultValue,
        ),
      } as never);
      vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
        update: vi.fn(() => Promise.resolve()),
      } as never);
      vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);
      const actions = createActions(source, dependencies);
      const groups = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
      const openDialogOptions = { canSelectFiles: true };

      await actions.persistLegends(groups as never);
      await actions.persistDefaultLegendVisibility('plugin:codegraphy.typescript:*.ts', false);
      await actions.persistLegendOrder(['plugin:codegraphy.typescript:*.ts', 'legend:user']);
      actions.showInformationMessage('saved');
      await actions.showOpenDialog(openDialogOptions as never);

      expect(updateSilently).toHaveBeenCalledWith('legend', groups);
      expect(updateSilently).toHaveBeenCalledWith('legendVisibility', {
        'plugin:codegraphy.typescript:*.ts': false,
      });
      expect(updateSilently).toHaveBeenCalledWith('legendOrder', [
        'plugin:codegraphy.typescript:*.ts',
        'legend:user',
      ]);
      expect(dependencies.window.showInformationMessage).toHaveBeenCalledWith('saved');
      expect(dependencies.window.showOpenDialog).toHaveBeenCalledWith(openDialogOptions);
    });



    it('merges repeated default-legend visibility updates against the current codegraphy config', async () => {
      const source = createSource();
      const dependencies = createDependencies();
      const updateSilently = vi.fn(async (key: string, value: unknown) => {
        if (key === 'legendVisibility') {
          legendVisibility = value as Record<string, boolean>;
        }
      });
      let legendVisibility: Record<string, boolean> = {};

      vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      } as never);
      vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
        get: vi.fn(<T>(key: string, defaultValue: T): T => (
          key === 'legendVisibility'
            ? (legendVisibility as T)
            : defaultValue
        )),
        update: vi.fn(() => Promise.resolve()),
      } as never);
      vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);

      const actions = createActions(source, dependencies);

      await actions.persistDefaultLegendVisibility('default:fileExtension:ts', false);
      await actions.persistDefaultLegendVisibility('default:fileExtension:js', false);

      expect(updateSilently).toHaveBeenNthCalledWith(1, 'legendVisibility', {
        'default:fileExtension:ts': false,
      });
      expect(updateSilently).toHaveBeenNthCalledWith(2, 'legendVisibility', {
        'default:fileExtension:ts': false,
        'default:fileExtension:js': false,
      });
    });



    it('merges batched default-legend visibility updates against the current codegraphy config', async () => {
      const source = createSource();
      const dependencies = createDependencies();
      const updateSilently = vi.fn(async (key: string, value: unknown) => {
        if (key === 'legendVisibility') {
          legendVisibility = value as Record<string, boolean>;
        }
      });
      let legendVisibility: Record<string, boolean> = { existing: true };

      vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      } as never);
      vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
        get: vi.fn(<T>(key: string, defaultValue: T): T => (
          key === 'legendVisibility'
            ? (legendVisibility as T)
            : defaultValue
        )),
        update: vi.fn(() => Promise.resolve()),
      } as never);
      vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);

      const actions = createActions(source, dependencies);

      await actions.persistDefaultLegendVisibilityBatch({
        'default:fileExtension:ts': false,
        'default:fileExtension:js': false,
      });

      expect(updateSilently).toHaveBeenCalledWith('legendVisibility', {
        existing: true,
        'default:fileExtension:ts': false,
        'default:fileExtension:js': false,
      });
    });



    it('delegates opening in the existing editor surface', async () => {
      const source = createSource();
      const actions = createActions(source);

      await actions.openInEditor();

      expect(source._webviewMethods.openInEditor).toHaveBeenCalledOnce();
    });
});

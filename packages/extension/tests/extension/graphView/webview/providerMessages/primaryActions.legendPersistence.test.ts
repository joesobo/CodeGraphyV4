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

describe('graph view provider legend persistence actions', () => {
  afterEach(() => { vi.restoreAllMocks(); });
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

});

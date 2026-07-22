import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../src/extension/repoSettings/defaults';
import { CodeGraphyRepoSettingsStore } from '../../../../src/extension/repoSettings/store';
import { serializeSettings } from '../../../../src/extension/repoSettings/store/persistence/serialization';
import {
  createTempWorkspace,
  readExtensionInterfaceData,
  readJson,
} from './fixture';

describe('extension/repoSettings/store initialization and normalization', () => {
  it('creates .codegraphy/settings.json from defaults instead of seeding legacy configuration', () => {
    const workspaceRoot = createTempWorkspace();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    const persisted = readJson<Record<string, unknown>>(settingsPath);

    expect(store.workspaceRoot).toBe(workspaceRoot);
    expect(store.settingsPath).toBe(settingsPath);
    expect(store.get('showOrphans', true)).toBe(true);
    expect(persisted).not.toHaveProperty('showOrphans');
    expect(readExtensionInterfaceData(persisted).showOrphans).toBe(true);
    expect(readExtensionInterfaceData(persisted).legend).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });


  it('creates .gitignore when missing and adds the CodeGraphy contents ignore once', () => {
    const workspaceRoot = createTempWorkspace();

    new CodeGraphyRepoSettingsStore(workspaceRoot);
    new CodeGraphyRepoSettingsStore(workspaceRoot);

    const gitIgnorePath = path.join(workspaceRoot, '.gitignore');
    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('.codegraphy/*\n');
  });


  it('reads persisted legend and node colors without legacy key aliases', () => {
    const workspaceRoot = createTempWorkspace();
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        version: 2,
        legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#112233' }],
        nodeColors: { file: '#999999', folder: '#445566' },
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('legend', [])).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(store.get('nodeColors', {})).toEqual(expect.objectContaining({
      file: '#999999',
      folder: '#445566',
    }));
  });


  it('drops unknown settings keys from persisted settings files', () => {
    const workspaceRoot = createTempWorkspace();
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        version: 2,
        filterPatterns: ['**/*.png'],
        exclude: ['**/*.tmp', '**/*.png'],
        edgeColors: { import: '#123456' },
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('filterPatterns', [])).toEqual(['**/*.png']);
    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    expect(persisted.exclude).toBeUndefined();
    expect(persisted.edgeColors).toBeUndefined();
  });


  it('keeps explicit legend and node color entries while dropping unknown keys', () => {
    const workspaceRoot = createTempWorkspace();
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        version: 2,
        legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#112233' }],
        nodeColors: { folder: '#445566', file: '#999999' },
        filterPatterns: ['**/*.png'],
        exclude: ['**/*.png', 42],
        edgeColors: { import: '#123456' },
      }, null, 2),
      'utf8',
    );

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);
    const persisted = readJson<Record<string, unknown>>(store.settingsPath);
    const extensionData = readExtensionInterfaceData(persisted);

    expect(store.get('legend', [])).toEqual([
      { id: 'legend-rule', pattern: 'src/**', color: '#112233' },
    ]);
    expect(store.get('folderNodeColor', '')).toBe('');
    expect(extensionData.legend).toEqual([
      { pattern: 'src/**', color: '#112233' },
    ]);
    expect(extensionData.nodeColors).toEqual(expect.objectContaining({
      folder: '#445566',
      file: '#999999',
    }));
    expect(persisted.exclude).toBeUndefined();
    expect(persisted.edgeColors).toBeUndefined();
    expect(persisted.filterPatterns).toEqual(['**/*.png']);
  });


  it('falls back to defaults when persisted settings are a non-object JSON value', () => {
    const workspaceRoot = createTempWorkspace();
    const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, '[]\n', 'utf8');

    const store = new CodeGraphyRepoSettingsStore(workspaceRoot);

    expect(store.get('legend', [])).toEqual([]);
    expect(store.get('filterPatterns', [])).toEqual([]);
    expect(readJson<Record<string, unknown>>(store.settingsPath)).toEqual(JSON.parse(
      serializeSettings(createDefaultCodeGraphyRepoSettings()),
    ));
  });

});

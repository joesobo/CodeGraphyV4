import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyExampleWorkspace,
  copyExampleTypescriptWorkspace,
  readExampleWorkspaceFiles,
} from './acceptance/graphView/workspace';

const examplesRoot = path.resolve(__dirname, '../../../examples');
const exampleWorkspaceNames = fs.readdirSync(examplesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('example-'))
  .map(entry => entry.name)
  .sort();

describe('acceptance graph view workspace fixtures', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it.each(exampleWorkspaceNames)('copies %s CodeGraphy settings from the example workspace', (exampleName) => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const sourceSettingsPath = path.join(examplesRoot, exampleName, '.codegraphy/settings.json');
    const workspacePath = copyExampleWorkspace(tempRoot, exampleName);
    const copiedSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    expect(fs.readFileSync(copiedSettingsPath, 'utf8')).toBe(fs.readFileSync(sourceSettingsPath, 'utf8'));
  });

  it('omits Unity editor-generated state when copying the Unity example workspace', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-unity');

    expect(fs.existsSync(path.join(workspacePath, 'Assets'))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, '.codegraphy/settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, 'Library'))).toBe(false);
    expect(fs.existsSync(path.join(workspacePath, 'Temp'))).toBe(false);
    expect(fs.existsSync(path.join(workspacePath, 'Logs'))).toBe(false);
    expect(fs.existsSync(path.join(workspacePath, 'UserSettings'))).toBe(false);
  });

  it('starts Unity acceptance fixtures with Unity default filters active for the file-only baseline', () => {
    const sourceSettingsPath = path.join(examplesRoot, 'example-unity/.codegraphy/settings.json');
    const sourceSettings = JSON.parse(fs.readFileSync(sourceSettingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      nodeVisibility?: Record<string, boolean>;
      plugins?: Array<{ enabled?: boolean; id?: string }>;
    };

    expect(sourceSettings.plugins).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.unity', enabled: true },
    ]);
    expect(sourceSettings.edgeVisibility).toEqual(expect.objectContaining({
      using: true,
      type: false,
      reference: false,
      call: false,
      event: false,
      contains: false,
    }));
    expect(sourceSettings.nodeVisibility).toEqual(expect.objectContaining({
      'plugin:codegraphy.unity:symbol': false,
      'plugin:codegraphy.unity:symbol:game-object': false,
      'plugin:codegraphy.unity:symbol:component': false,
    }));
  });

  it('shows Unity using edges in the example default graph state', () => {
    const sourceSettingsPath = path.join(examplesRoot, 'example-unity/.codegraphy/settings.json');
    const sourceSettings = JSON.parse(fs.readFileSync(sourceSettingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      nodeVisibility?: Record<string, boolean>;
    };

    expect(sourceSettings.edgeVisibility?.using).toBe(true);
    expect(sourceSettings.nodeVisibility?.file).toBe(true);
    expect(sourceSettings.nodeVisibility?.package).toBe(true);
  });

  it('can add VS Code settings for scenarios that assert that node without changing CodeGraphy settings', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const sourceSettingsPath = path.join(examplesRoot, 'example-typescript/.codegraphy/settings.json');
    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeVSCodeSettings: true,
    });
    const copiedSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
    expect(fs.readFileSync(copiedSettingsPath, 'utf8')).toBe(fs.readFileSync(sourceSettingsPath, 'utf8'));
  });

  it('can write a neutral TypeScript fixture baseline for non-example graph scenarios', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeTypeImportEdges: true,
      pluginPackages: ['@codegraphy-dev/plugin-markdown'],
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      favorites?: string[];
      plugins?: Array<{ enabled?: boolean; id?: string }>;
      respectGitignore?: boolean;
    };

    expect(settings.favorites).toBeUndefined();
    expect(settings.plugins).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
    ]);
    expect(settings.respectGitignore).toBe(false);
    expect(settings.edgeVisibility).toEqual(expect.objectContaining({
      import: true,
      'type-import': true,
      call: false,
      inherit: true,
      reference: true,
      load: true,
    }));
  });

  it('can start a TypeScript fixture with import edges hidden and nests ready for graph scope scenarios', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeImportEdges: false,
      includeNestsEdges: true,
      includeTypeImportEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility).toEqual(expect.objectContaining({
      import: false,
      nests: true,
      'type-import': true,
    }));
  });

  it('keeps Markdown example reference edges visible for the relationships asserted by its spec', () => {
    const sourceSettingsPath = path.resolve(__dirname, '../../../examples/example-markdown/.codegraphy/settings.json');
    const sourceSettings = JSON.parse(fs.readFileSync(sourceSettingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      plugins?: Array<{ enabled?: boolean; id?: string }>;
    };

    expect(sourceSettings.plugins).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
    ]);
    expect(sourceSettings.edgeVisibility).toEqual(expect.objectContaining({
      reference: true,
    }));
  });

  it('omits VS Code settings from TypeScript fixtures unless the scenario asserts that node', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot);
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).not.toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
  });

  it('keeps Svelte type import edges disabled until the spec toggles them on', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.['type-import']).toBe(false);
  });

  it('keeps Godot edge families disabled until the specs toggle them on', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-godot');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility).toEqual(expect.objectContaining({
      call: false,
      inherit: false,
      contains: false,
      'codegraphy.gdscript:signal-connection': false,
    }));
  });

  it('copies Vue active plugins and filters from the example settings', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-vue');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      filterPatterns?: string[];
      plugins?: Array<{ activation?: 'disabled' | 'enabled' | 'inherit'; id?: string }>;
    };

    expect(settings.plugins).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.typescript', activation: 'enabled' },
      { id: 'codegraphy.vue', activation: 'enabled' },
    ]);
    expect(settings.filterPatterns).toEqual(['src/vue.d.ts']);
  });

  it('applies copied Svelte app declaration filters when reading expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      filterPatterns?: string[];
    };
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(settings.filterPatterns).toEqual(['src/app.d.ts']);
    expect(files).not.toContain('src/app.d.ts');
  });

  it('omits active-filtered generated package artifacts from expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = path.join(tempRoot, 'workspace');
    fs.mkdirSync(path.join(workspacePath, '.codegraphy'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'node_modules/.bin'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, '.svelte-kit'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, '.turbo'), { recursive: true });
    fs.writeFileSync(
      path.join(workspacePath, '.codegraphy/settings.json'),
      `${JSON.stringify({ filterPatterns: ['**/.svelte-kit/**'] }, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(workspacePath, 'README.md'), '# Example\n');
    fs.writeFileSync(path.join(workspacePath, 'node_modules/.bin/vite'), '');
    fs.writeFileSync(path.join(workspacePath, 'dist/bundle.js'), '');
    fs.writeFileSync(path.join(workspacePath, '.svelte-kit/generated.d.ts'), '');
    fs.writeFileSync(path.join(workspacePath, '.turbo/turbo-build.log'), '');

    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toEqual(['README.md']);
  });

  it('applies plugin default filters when reading expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte');
    fs.mkdirSync(path.join(workspacePath, '.svelte-kit'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, '.svelte-kit/generated.d.ts'), '');

    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).not.toContain('.svelte-kit/generated.d.ts');
  });

  it('honors disabled custom and plugin filters when reading expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte');
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>;
    fs.mkdirSync(path.join(workspacePath, '.svelte-kit'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, '.svelte-kit/generated.d.ts'), '');
    fs.writeFileSync(
      settingsPath,
      `${JSON.stringify({
        ...settings,
        disabledCustomFilterPatterns: ['src/app.d.ts'],
        plugins: [
          { id: 'codegraphy.markdown', enabled: true },
          { id: 'codegraphy.typescript', enabled: true },
          {
            id: 'codegraphy.svelte',
            enabled: true,
            disabledFilterPatterns: ['**/.svelte-kit/**'],
          },
        ],
      }, null, 2)}\n`,
    );

    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toContain('src/app.d.ts');
    expect(files).toContain('.svelte-kit/generated.d.ts');
  });

  it('reads Vue expected files through the generic acceptance fixture path', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-vue');
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toContain('src/App.vue');
    expect(files).toContain('src/components/LazyProfilePanel.vue');
    expect(files).toContain('src/inheritance.ts');
    expect(files).not.toContain('src/vue.d.ts');
    expect(files).toHaveLength(16);
  });

  it('rewrites markdown example links for the copied workspace root', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-markdown');
    const homePath = path.join(workspacePath, 'notes/Home.md');
    const commentedPath = path.join(workspacePath, 'src/commented.ts');
    const homeContent = fs.readFileSync(homePath, 'utf8');
    const commentedContent = fs.readFileSync(commentedPath, 'utf8');

    expect(homeContent).toContain('[[notes/Architecture.md]]');
    expect(homeContent).toContain('![[notes/assets/Diagram.md]]');
    expect(homeContent).toContain('[[src/commented.ts]]');
    expect(homeContent).toContain('[[example-markdown/notes/guides/Setup.md|Setup Guide]]');
    expect(commentedContent).toContain('[[notes/Architecture.md]]');
  });
});

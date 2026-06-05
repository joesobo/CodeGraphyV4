import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyExampleWorkspace,
  copyExampleTypescriptWorkspace,
  readExampleWorkspaceFiles,
} from './acceptance/graphView/workspace';

describe('acceptance graph view workspace fixtures', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes settings for the relationships asserted by acceptance scenarios', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeVSCodeSettings: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const files = await readExampleWorkspaceFiles(workspacePath);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      plugins?: Array<{ package?: string }>;
      respectGitignore?: boolean;
    };

    expect(files).toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
    expect(settings.respectGitignore).toBe(false);
    expect(settings.edgeVisibility).toEqual(expect.objectContaining({
      import: true,
      'type-import': false,
      call: false,
      inherit: true,
      reference: true,
      load: true,
    }));
    expect(settings.plugins).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
    ]);
  });

  it('omits VS Code settings from TypeScript fixtures unless the scenario asserts that node', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot);
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).not.toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
  });

  it('can expose TypeScript type import edges for scenarios that assert the extra connection', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeTypeImportEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.['type-import']).toBe(true);
  });

  it('can expose Svelte type import edges for the Svelte acceptance scenario', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte', {
      includeTypeImportEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.['type-import']).toBe(true);
  });

  it('can activate package plugins for examples that assert plugin relationships immediately', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-vue', {
      pluginPackages: [
        '@codegraphy-dev/plugin-markdown',
        '@codegraphy-dev/plugin-vue',
      ],
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      plugins?: Array<{ package?: string }>;
    };

    expect(settings.plugins).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
      { package: '@codegraphy-dev/plugin-vue' },
    ]);
  });

  it('can apply Svelte app declaration filters when reading expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte', {
      filterPatterns: ['src/app.d.ts'],
    });
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

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte', {
      pluginPackages: [
        '@codegraphy-dev/plugin-markdown',
        '@codegraphy-dev/plugin-svelte',
      ],
    });
    fs.mkdirSync(path.join(workspacePath, '.svelte-kit'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, '.svelte-kit/generated.d.ts'), '');

    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).not.toContain('.svelte-kit/generated.d.ts');
  });

  it('honors disabled custom and plugin filters when reading expected acceptance files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-svelte', {
      filterPatterns: ['src/app.d.ts'],
    });
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
          { package: '@codegraphy-dev/plugin-markdown' },
          {
            package: '@codegraphy-dev/plugin-svelte',
            disabledFilterPatterns: ['**/.svelte-kit/**'],
          },
        ],
      }, null, 2)}\n`,
    );

    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toContain('src/app.d.ts');
    expect(files).toContain('.svelte-kit/generated.d.ts');
  });

  it('can expose call edges for language scenarios that assert imported-call connections', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-go', {
      includeCallEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.call).toBe(true);
  });

  it('can hide inherit edges for examples that assert only import relationships', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-pascal', {
      includeInheritEdges: false,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.inherit).toBe(false);
  });

  it('reads Vue expected files through the generic acceptance fixture path', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-vue', {
      filterPatterns: ['src/vue.d.ts'],
    });
    const files = await readExampleWorkspaceFiles(workspacePath);

    expect(files).toContain('src/App.vue');
    expect(files).toContain('src/components/LazyProfilePanel.vue');
    expect(files).not.toContain('src/vue.d.ts');
    expect(files).toHaveLength(15);
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

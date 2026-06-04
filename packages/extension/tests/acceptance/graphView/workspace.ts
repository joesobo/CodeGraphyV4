import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const EXPECTED_EXAMPLE_TYPESCRIPT_FILES = [
  '.gitignore',
  'README.md',
  'package.json',
  'src/alias/greeting.ts',
  'src/depth.ts',
  'src/index.ts',
  'src/leaf.ts',
  'src/orphan.ts',
  'src/types.ts',
  'src/utils.ts',
  'tsconfig.json',
] as const;

export const EXPECTED_EXAMPLE_VUE_FILES = [
  '.gitignore',
  'README.md',
  'index.html',
  'package.json',
  'src/App.vue',
  'src/components/CounterPanel.vue',
  'src/components/StatusBadge.vue',
  'src/components/UserCard.vue',
  'src/composables/useCounter.ts',
  'src/data/users.ts',
  'src/main.ts',
  'src/types.ts',
  'tsconfig.json',
  'vite.config.ts',
] as const;

export function createWorkspaceTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-'));
}

export function repoRoot(): string {
  return path.resolve(__dirname, '../../../../..');
}

export function extensionRoot(): string {
  return path.resolve(repoRoot(), 'packages/extension');
}

export function copyExampleTypescriptWorkspace(tempRoot: string): string {
  const sourcePath = path.join(repoRoot(), 'examples/example-typescript');
  const workspacePath = path.join(tempRoot, 'example-typescript');

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}.codegraphy${path.sep}`),
  });
  writeAcceptanceSettings(workspacePath);

  return workspacePath;
}

export function copyExampleVueWorkspace(tempRoot: string): string {
  const sourcePath = path.join(repoRoot(), 'examples/vue-example');
  const workspacePath = path.join(tempRoot, 'vue-example');

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(sourcePath, source).split(path.sep).join('/');
      return relativePath !== 'node_modules'
        && !relativePath.startsWith('node_modules/')
        && relativePath !== 'dist'
        && !relativePath.startsWith('dist/')
        && relativePath !== '.codegraphy/graph.lbug'
        && relativePath !== '.codegraphy/meta.json';
    },
  });

  return workspacePath;
}

export function readExampleTypescriptFiles(workspacePath: string): string[] {
  return collectFiles(workspacePath)
    .filter(filePath => !filePath.startsWith('.codegraphy/'))
    .sort();
}

export function readExampleVueFiles(workspacePath: string): string[] {
  return collectFiles(workspacePath)
    .filter(filePath => !filePath.startsWith('.codegraphy/'))
    .filter(filePath => filePath !== 'src/vue.d.ts')
    .sort();
}

function collectFiles(root: string, current = root): string[] {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      return collectFiles(root, absolutePath);
    }

    return [relativePath];
  });
}

function writeAcceptanceSettings(workspacePath: string): void {
  const targetSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  const settings = {
    version: 1,
    edgeVisibility: {
      nests: false,
      import: true,
      'type-import': false,
      reexport: false,
      call: false,
      inherit: false,
      reference: false,
      test: false,
      load: false,
      contains: false,
      overrides: false,
    },
  };

  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXAMPLES_WITH_ASSERTED_VSCODE_SETTINGS = new Set([
  'example-csharp',
  'example-godot',
  'example-python',
]);

interface CopyExampleWorkspaceOptions {
  includeCallEdges?: boolean;
  includeVSCodeSettings?: boolean;
  includeTypeImportEdges?: boolean;
}

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

export function copyExampleTypescriptWorkspace(
  tempRoot: string,
  options: CopyExampleWorkspaceOptions = {},
): string {
  return copyExampleWorkspace(tempRoot, 'example-typescript', options);
}

export function copyExampleWorkspace(
  tempRoot: string,
  exampleName: string,
  options: CopyExampleWorkspaceOptions = {},
): string {
  const sourcePath = path.join(repoRoot(), 'examples', exampleName);
  const workspacePath = path.join(tempRoot, exampleName);

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}.codegraphy${path.sep}`),
  });
  rewriteMarkdownAcceptanceLinks(workspacePath, exampleName);
  writeAcceptanceVSCodeSettings(workspacePath, exampleName, options);
  writeAcceptanceSettings(workspacePath, options);

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
  return readExampleWorkspaceFiles(workspacePath);
}

export function readExampleWorkspaceFiles(workspacePath: string): string[] {
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

function rewriteMarkdownAcceptanceLinks(workspacePath: string, exampleName: string): void {
  if (exampleName !== 'example-markdown') {
    return;
  }

  for (const relativePath of ['notes/Home.md', 'src/commented.ts']) {
    const filePath = path.join(workspacePath, relativePath);
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(
      filePath,
      content
        .replace(/example-markdown\/notes\/Architecture\.md/g, 'notes/Architecture.md')
        .replace(/example-markdown\/notes\/assets\/Diagram\.md/g, 'notes/assets/Diagram.md')
        .replace(/example-markdown\/src\/commented\.ts/g, 'src/commented.ts'),
    );
  }
}

function writeAcceptanceVSCodeSettings(
  workspacePath: string,
  exampleName: string,
  options: CopyExampleWorkspaceOptions,
): void {
  const includeSettings = options.includeVSCodeSettings ?? EXAMPLES_WITH_ASSERTED_VSCODE_SETTINGS.has(exampleName);

  if (!includeSettings) {
    return;
  }

  const targetSettingsPath = path.join(workspacePath, '.vscode/settings.json');
  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, '{}\n');
}

function writeAcceptanceSettings(workspacePath: string, options: CopyExampleWorkspaceOptions): void {
  const targetSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  const settings = {
    version: 1,
    respectGitignore: false,
    plugins: [{
      package: '@codegraphy-dev/plugin-markdown',
    }],
    edgeVisibility: {
      nests: false,
      import: true,
      'type-import': options.includeTypeImportEdges ?? false,
      reexport: false,
      call: options.includeCallEdges ?? false,
      inherit: true,
      reference: true,
      test: false,
      load: true,
      contains: false,
      overrides: false,
    },
  };

  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

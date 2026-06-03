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

export function readExampleTypescriptFiles(workspacePath: string): string[] {
  return collectFiles(workspacePath)
    .filter(filePath => !filePath.startsWith('.codegraphy/'))
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

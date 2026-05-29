import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../src/plugin';

function createWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-typescript-'));
}

function writeWorkspaceFile(workspaceRoot: string, relativePath: string, contents: string): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
}

describe('createTypeScriptPlugin', () => {
  it('exposes manifest metadata', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.typescript',
      name: 'TypeScript/JavaScript',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: expect.arrayContaining(['.ts', '.tsx', '.js', '.jsx']),
    });
  });

  it('keeps TypeScript ecosystem filters while leaving file theming to core Material defaults', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.defaultFilters).toContain('**/node_modules/**');
    expect(plugin.fileColors).toEqual({});
  });

  it('contributes a default-visible TypeScript Alias Import edge type', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.contributeEdgeTypes?.()).toEqual([
      {
        id: 'codegraphy.typescript:alias-import',
        label: 'TypeScript Alias Import',
        defaultColor: '#38BDF8',
        defaultVisible: true,
      },
    ]);
  });

  it('keeps plugin analysis focused on TypeScript alias imports', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toEqual(expect.any(Function));
    expect(plugin.initialize).toBeUndefined();
    expect(plugin.onLoad).toBeUndefined();
    expect(plugin.onUnload).toBeUndefined();
  });

  it('emits TypeScript Alias Import relationships from root tsconfig paths', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { cn } from '@/registry/bases/radix/lib/utils';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/registry/bases/radix/lib/utils.ts',
        'export function cn(): string { return String(); }\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { cn } from '@/registry/bases/radix/lib/utils';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@/registry/bases/radix/lib/utils',
        },
      ]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('follows local tsconfig extends when resolving TypeScript alias imports', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: './tsconfig.base.json',
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '~/*': ['src/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { format } from '~/format';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/format.ts',
        'export function format(): string { return String(); }\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { format } from '~/format';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '~/format',
        },
      ]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('follows package-based tsconfig extends when resolving TypeScript alias imports', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: '@org/tsconfig/base',
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'node_modules/@org/tsconfig/base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '../../..',
            paths: {
              '#shared/*': ['src/shared/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { token } from '#shared/token';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/shared/token.ts',
        'export const token = Symbol();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '#shared/token';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '#shared/token',
        },
      ]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('supports exact aliases and fallback targets in TypeScript paths', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@theme': ['missing/theme.ts', 'src/theme.ts'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { theme } from '@theme';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/theme.ts',
        'export const theme = String();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { theme } from '@theme';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@theme',
        },
      ]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('does not emit relationships for unresolved TypeScript alias imports', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@missing/*': ['src/missing/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { missing } from '@missing/module';\n",
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { missing } from '@missing/module';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('does not emit TypeScript Alias Import relationships for JavaScript files', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/*': ['src/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.js',
        "import { token } from '@/token';\n",
      );
      writeWorkspaceFile(
        workspaceRoot,
        'src/token.ts',
        'export const token = Symbol();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '@/token';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([]);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('requests TypeScript file re-analysis when tsconfig changes', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const tsconfigPath = writeWorkspaceFile(workspaceRoot, 'tsconfig.json', '{}\n');
      const appPath = writeWorkspaceFile(workspaceRoot, 'src/app.ts', 'export {};\n');
      const javascriptPath = writeWorkspaceFile(workspaceRoot, 'src/app.js', 'export {};\n');

      const plugin = createTypeScriptPlugin();
      await plugin.onPreAnalyze?.(
        [
          { absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' },
          { absolutePath: appPath, relativePath: 'src/app.ts', content: 'export {};\n' },
          { absolutePath: javascriptPath, relativePath: 'src/app.js', content: 'export {};\n' },
        ],
        workspaceRoot,
      );

      await expect(plugin.onFilesChanged?.(
        [{ absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' }],
        workspaceRoot,
      )).resolves.toEqual(['src/app.ts']);
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

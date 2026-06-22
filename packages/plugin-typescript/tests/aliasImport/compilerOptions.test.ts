import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { createTypeScriptPlugin } from '../../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from '../workspace';

describe('TypeScript Alias Import compiler options support', () => {
  it('uses the nearest ancestor tsconfig for files in nested projects', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'packages/app/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@app/*': ['src/alias/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'packages/app/src/index.ts',
        "import { token } from '@app/token';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'packages/app/src/alias/token.ts',
        'export const token = Symbol();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '@app/token';\n",
        workspaceRoot,
      );

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual({
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@app/token',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('uses child paths replacement and effective baseUrl from extended tsconfig', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: 'base',
            paths: {
              '#base/*': ['src/*'],
            },
          },
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: './tsconfig.base.json',
          compilerOptions: {
            baseUrl: 'child',
            paths: {
              '#child/*': ['src/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'app.ts',
        "import { base } from '#base/value';\nimport { child } from '#child/value';\n",
      );
      writeWorkspaceFile(
        workspaceRoot,
        'base/src/value.ts',
        'export const base = true;\n',
      );
      const childTargetPath = writeWorkspaceFile(
        workspaceRoot,
        'child/src/value.ts',
        'export const child = true;\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { base } from '#base/value';\nimport { child } from '#child/value';\n",
        workspaceRoot,
      );

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual({
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: childTargetPath,
          resolvedPath: childTargetPath,
          specifier: '#child/value',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('resolves inherited paths against a child baseUrl override', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: 'base',
            paths: {
              '#base/*': ['src/*'],
            },
          },
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: './tsconfig.base.json',
          compilerOptions: {
            baseUrl: 'child',
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'app.ts',
        "import { base } from '#base/value';\n",
      );
      writeWorkspaceFile(
        workspaceRoot,
        'base/src/value.ts',
        'export const base = true;\n',
      );
      const childTargetPath = writeWorkspaceFile(
        workspaceRoot,
        'child/src/value.ts',
        'export const base = true;\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { base } from '#base/value';\n",
        workspaceRoot,
      );

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual({
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: childTargetPath,
          resolvedPath: childTargetPath,
          specifier: '#base/value',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('parses tsconfig JSON with comments and trailing commas', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        `{
          // shadcn-style import aliases
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@/*": ["src/*"],
            },
          },
        }\n`,
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { token } from '@/token';\n",
      );
      const targetPath = writeWorkspaceFile(
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

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual({
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@/token',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('reads path aliases without scanning project files', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const readDirectory = vi.spyOn(ts.sys, 'readDirectory')
      .mockImplementation(() => {
        throw new Error('project file scanning should not run for alias config');
      });

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
        "import { token } from '@/token';\n",
      );
      const targetPath = writeWorkspaceFile(
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@/token',
        },
      ]);
      expect(readDirectory).not.toHaveBeenCalled();
    } finally {
      readDirectory.mockRestore();
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('emits no relationships when nearest tsconfig has no paths', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
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

      expect(result).toBeDefined();
      expect(result?.relations).toEqual([]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('emits no relationships when nearest tsconfig cannot be parsed', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(workspaceRoot, 'tsconfig.json', '{ invalid json');
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
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

      expect(result).toBeDefined();
      expect(result?.relations).toEqual([]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

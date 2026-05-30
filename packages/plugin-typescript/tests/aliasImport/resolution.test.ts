import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from '../workspace';

describe('TypeScript Alias Import target resolution', () => {
  it('supports exact aliases and fallback targets', async () => {
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

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual({
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@theme',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('supports wildcard-only aliases', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '*': ['src/types/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { theme } from 'theme';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/types/theme.ts',
        'export const theme = String();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { theme } from 'theme';\n",
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
          specifier: 'theme',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('prefers the most specific wildcard alias pattern', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '*': ['src/fallback/*'],
              '@app/*': ['src/specific/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { token } from '@app/token';\n",
      );
      writeWorkspaceFile(
        workspaceRoot,
        'src/fallback/@app/token.ts',
        'export const token = Symbol();\n',
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/specific/token.ts',
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

  it('resolves alias imports to declaration files', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '#types/*': ['types/*'],
            },
          },
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import type { Theme } from '#types/theme';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'types/theme.d.ts',
        'export type Theme = string;\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import type { Theme } from '#types/theme';\n",
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
          specifier: '#types/theme',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('resolves JavaScript extension imports to TypeScript source files', async () => {
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
        "import { token } from '@/token.js';\n",
      );
      const targetPath = writeWorkspaceFile(
        workspaceRoot,
        'src/token.ts',
        'export const token = Symbol();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '@/token.js';\n",
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
          specifier: '@/token.js',
        },
      );
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

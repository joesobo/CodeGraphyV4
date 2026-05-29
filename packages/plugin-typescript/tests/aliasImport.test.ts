import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from './workspace';

describe('TypeScript Alias Import analysis', () => {
  it('emits relationships from root tsconfig paths', async () => {
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
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('follows local tsconfig extends', async () => {
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
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('follows package-based tsconfig extends', async () => {
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
      removeWorkspaceRoot(workspaceRoot);
    }
  });

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
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('does not emit relationships for unresolved aliases', async () => {
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
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('does not emit relationships for JavaScript files', async () => {
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
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

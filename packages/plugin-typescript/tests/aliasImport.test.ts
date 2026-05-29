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

  it('follows bare package tsconfig extends through package metadata', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: '@org/tsconfig',
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'node_modules/@org/tsconfig/package.json',
        JSON.stringify({
          tsconfig: 'configs/base.json',
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'node_modules/@org/tsconfig/configs/base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '../../../..',
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: childTargetPath,
          resolvedPath: childTargetPath,
          specifier: '#child/value',
        },
      ]);
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: childTargetPath,
          resolvedPath: childTargetPath,
          specifier: '#base/value',
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: 'theme',
        },
      ]);
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@app/token',
        },
      ]);
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '#types/theme',
        },
      ]);
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

      expect(result?.relations).toEqual([
        {
          kind: 'codegraphy.typescript:alias-import',
          sourceId: 'compiler-options-paths',
          fromFilePath: sourcePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: '@/token.js',
        },
      ]);
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

  it('does not emit relationships from commented-out imports', async () => {
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
        "// import { token } from '@/token';\n",
      );
      writeWorkspaceFile(
        workspaceRoot,
        'src/token.ts',
        'export const token = Symbol();\n',
      );

      const plugin = createTypeScriptPlugin();
      const result = await plugin.analyzeFile?.(
        sourcePath,
        "// import { token } from '@/token';\n",
        workspaceRoot,
      );

      expect(result?.relations).toEqual([]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

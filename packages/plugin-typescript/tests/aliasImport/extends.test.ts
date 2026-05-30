import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../../src/plugin';
import {
  createWorkspaceRoot,
  expectedAliasImportRelation,
  removeWorkspaceRoot,
  writeWorkspaceFile,
} from '../workspace';

describe('TypeScript Alias Import tsconfig extends support', () => {
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

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual(expectedAliasImportRelation(sourcePath, targetPath, '~/format'));
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

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual(expectedAliasImportRelation(sourcePath, targetPath, '#shared/token'));
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

      expect(result).toBeDefined();
      expect(result?.relations).toHaveLength(1);
      expect(result?.relations[0]).toEqual(expectedAliasImportRelation(sourcePath, targetPath, '#shared/token'));
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

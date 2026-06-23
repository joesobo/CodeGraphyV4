import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from './workspace';

describe('TypeScript plugin lifecycle', () => {
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

      const changedFiles = await plugin.onFilesChanged?.(
        [{ absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' }],
        workspaceRoot,
      );

      expect(changedFiles).toHaveLength(1);
      expect(changedFiles).toEqual(['src/app.ts']);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('requests re-analysis when tsconfig changes alongside other files', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const tsconfigPath = writeWorkspaceFile(workspaceRoot, 'tsconfig.json', '{}\n');
      const readmePath = writeWorkspaceFile(workspaceRoot, 'README.md', '# Project\n');
      const appPath = writeWorkspaceFile(workspaceRoot, 'src/app.ts', 'export {};\n');

      const plugin = createTypeScriptPlugin();
      await plugin.onPreAnalyze?.(
        [{ absolutePath: appPath, relativePath: 'src/app.ts', content: 'export {};\n' }],
        workspaceRoot,
      );

      const changedFiles = await plugin.onFilesChanged?.(
        [
          { absolutePath: readmePath, relativePath: 'README.md', content: '# Project\n' },
          { absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' },
        ],
        workspaceRoot,
      );

      expect(changedFiles).toHaveLength(1);
      expect(changedFiles).toEqual(['src/app.ts']);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('returns an empty re-analysis list for tsconfig changes before pre-analysis', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const tsconfigPath = writeWorkspaceFile(workspaceRoot, 'tsconfig.json', '{}\n');

      const plugin = createTypeScriptPlugin();
      const changedFiles = await plugin.onFilesChanged?.(
        [{ absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' }],
        workspaceRoot,
      );

      expect(changedFiles).toBeDefined();
      expect(changedFiles).toEqual([]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('invalidates cached alias config when an extended tsconfig changes', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const baseConfigPath = writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '#/*': ['src-a/*'],
            },
          },
        }),
      );
      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.json',
        JSON.stringify({
          extends: './tsconfig.base.json',
        }),
      );
      const sourcePath = writeWorkspaceFile(
        workspaceRoot,
        'src/app.ts',
        "import { token } from '#/token';\n",
      );
      const firstTargetPath = writeWorkspaceFile(
        workspaceRoot,
        'src-a/token.ts',
        'export const token = 1;\n',
      );
      const secondTargetPath = writeWorkspaceFile(
        workspaceRoot,
        'src-b/token.ts',
        'export const token = 2;\n',
      );

      const plugin = createTypeScriptPlugin();
      await plugin.onPreAnalyze?.(
        [{ absolutePath: sourcePath, relativePath: 'src/app.ts', content: 'export {};\n' }],
        workspaceRoot,
      );

      const firstResult = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '#/token';\n",
        workspaceRoot,
      );

      writeWorkspaceFile(
        workspaceRoot,
        'tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '#/*': ['src-b/*'],
            },
          },
        }),
      );
      await plugin.onFilesChanged?.(
        [{ absolutePath: baseConfigPath, relativePath: 'tsconfig.base.json', content: '' }],
        workspaceRoot,
      );

      const secondResult = await plugin.analyzeFile?.(
        sourcePath,
        "import { token } from '#/token';\n",
        workspaceRoot,
      );

      expect(firstResult?.relations?.[0]?.resolvedPath).toBe(firstTargetPath);
      expect(secondResult?.relations?.[0]?.resolvedPath).toBe(secondTargetPath);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

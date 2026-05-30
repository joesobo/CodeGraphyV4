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
});

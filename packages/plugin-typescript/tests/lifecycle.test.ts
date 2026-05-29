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

      await expect(plugin.onFilesChanged?.(
        [{ absolutePath: tsconfigPath, relativePath: 'tsconfig.json', content: '{}\n' }],
        workspaceRoot,
      )).resolves.toEqual(['src/app.ts']);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});

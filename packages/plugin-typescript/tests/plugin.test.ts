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
});

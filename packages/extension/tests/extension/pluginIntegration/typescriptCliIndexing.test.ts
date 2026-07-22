import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { indexCodeGraphyWorkspace } from '@codegraphy-dev/core';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';

describe('TypeScript CLI-style indexing', () => {
  it('rebuilds alias relationships when tsconfig changes in a fresh plugin process', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-ts-cli-'));
    await fs.mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, 'src-a'), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, 'src-b'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, 'src', 'app.ts'), "import { token } from '#/token';\n");
    await fs.writeFile(path.join(workspaceRoot, 'src-a', 'token.ts'), 'export const token = 1;\n');
    await fs.writeFile(path.join(workspaceRoot, 'src-b', 'token.ts'), 'export const token = 2;\n');
    await fs.writeFile(path.join(workspaceRoot, 'README.md'), '# Unrelated\n');

    const writeConfig = (target: 'src-a' | 'src-b') => fs.writeFile(
      path.join(workspaceRoot, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '#/*': [`${target}/*`] } } }),
    );
    const index = () => indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [createTypeScriptPlugin()],
    });

    await writeConfig('src-a');
    const initial = await index();
    await writeConfig('src-b');
    const refreshed = await index();

    expect(initial.graph.edges).toContainEqual(expect.objectContaining({
      from: 'src/app.ts',
      to: 'src-a/token.ts',
      kind: 'codegraphy.typescript:alias-import',
    }));
    expect(refreshed.indexing.mode).toBe('incremental');
    expect(refreshed.graph.edges).toContainEqual(expect.objectContaining({
      from: 'src/app.ts',
      to: 'src-b/token.ts',
      kind: 'codegraphy.typescript:alias-import',
    }));
    expect(refreshed.graph.edges).not.toContainEqual(expect.objectContaining({
      from: 'src/app.ts',
      to: 'src-a/token.ts',
      kind: 'codegraphy.typescript:alias-import',
    }));
    expect(refreshed.indexing.reusedFiles).toBeGreaterThan(0);
  });
});

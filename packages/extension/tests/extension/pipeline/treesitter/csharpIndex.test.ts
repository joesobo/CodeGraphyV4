import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearCSharpWorkspaceIndex,
  createEmptyCSharpIndex,
  getCSharpWorkspaceIndex,
  preAnalyzeCSharpTreeSitterFiles,
  resolveCSharpTypePathInNamespace,
  setCSharpWorkspaceIndex,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-csharp-index-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('pipeline/plugins/treesitter/runtime/csharpIndex', () => {
  it('indexes block-scoped namespace declarations for later type resolution', async () => {
    const workspaceRoot = await createWorkspace({
      'src/Program.cs': [
        'using MyApp.Services;',
        '',
        'namespace MyApp',
        '{',
        '    class Program',
        '    {',
        '        void Run()',
        '        {',
        '            var api = new ApiService();',
        '        }',
        '    }',
        '}',
        '',
      ].join('\n'),
      'src/Services/ApiService.cs': [
        'namespace MyApp.Services',
        '{',
        '    public class ApiService {}',
        '}',
        '',
      ].join('\n'),
    });

    const programPath = path.join(workspaceRoot, 'src/Program.cs');
    const apiServicePath = path.join(workspaceRoot, 'src/Services/ApiService.cs');
    await preAnalyzeCSharpTreeSitterFiles(
      [
        {
          absolutePath: programPath,
          content: await fs.readFile(programPath, 'utf8'),
        },
        {
          absolutePath: apiServicePath,
          content: await fs.readFile(apiServicePath, 'utf8'),
        },
      ],
      workspaceRoot,
    );

    expect(
      resolveCSharpTypePathInNamespace(
        workspaceRoot,
        programPath,
        'MyApp.Services',
        'ApiService',
      ),
    ).toBe(apiServicePath);
  });

  it('stores and clears workspace indexes', () => {
    const workspaceRoot = '/workspace/store';
    const index = createEmptyCSharpIndex();

    expect(index.typesByQualifiedName.size).toBe(0);
    expect(getCSharpWorkspaceIndex(workspaceRoot)).toBeUndefined();

    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(getCSharpWorkspaceIndex(workspaceRoot)).toBe(index);

    clearCSharpWorkspaceIndex(workspaceRoot);

    expect(getCSharpWorkspaceIndex(workspaceRoot)).toBeUndefined();
  });
});

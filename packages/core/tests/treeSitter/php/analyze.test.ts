import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-php-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzePhp', () => {
  it('extracts PHP use relationships, simple inheritance, and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Base/BaseRunner.php': '<?php\nnamespace App\\Base;\nclass BaseRunner {}\n',
      'src/App/Contracts/Runnable.php': '<?php\nnamespace App\\Contracts;\ninterface Runnable {}\n',
      'src/App/Model/User.php': '<?php\nnamespace App\\Model;\nclass User {}\n',
    });
    const runnerPath = path.join(workspaceRoot, 'src/App/Feature/Runner.php');
    const source = [
      '<?php',
      'namespace App\\Feature;',
      '',
      'use App\\Base\\BaseRunner;',
      'use App\\Contracts\\Runnable;',
      'use App\\Model\\User;',
      'use Vendor\\Package\\Thing;',
      '',
      'class Runner extends BaseRunner implements Runnable {',
      '    public function run(User $user): string {',
      '        return $user->name;',
      '    }',
      '}',
      '',
      'function boot(): Runner {',
      '    return new Runner();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'App\\Base\\BaseRunner',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'src/App/Base/BaseRunner.php'),
        toFilePath: path.join(workspaceRoot, 'src/App/Base/BaseRunner.php'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'Vendor\\Package\\Thing',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'src/App/Base/BaseRunner.php'),
        toFilePath: path.join(workspaceRoot, 'src/App/Base/BaseRunner.php'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'Runnable',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'src/App/Contracts/Runnable.php'),
        toFilePath: path.join(workspaceRoot, 'src/App/Contracts/Runnable.php'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });
});

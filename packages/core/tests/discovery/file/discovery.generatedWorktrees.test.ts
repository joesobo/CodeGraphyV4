import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileDiscovery } from '../../../src/discovery/file/service';

describe('FileDiscovery generated worktrees', () => {
  let tempDir: string;

  function createFile(relativePath: string): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '');
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-generated-worktree-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not spend the file limit on generated Claude worktrees', async () => {
    createFile('.claude/worktrees/generated/src/app.ts');
    createFile('.claude/worktrees/generated/src/model.ts');
    createFile('src/app.ts');

    const result = await new FileDiscovery().discover({
      rootPath: tempDir,
      maxFiles: 1,
    });

    expect(result.files.map((file) => file.relativePath)).toEqual([path.join('src', 'app.ts')]);
    expect(result.limitReached).toBe(false);
  });
});

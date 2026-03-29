import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileDiscovery } from '../../../../src/core/discovery/file/service';

describe('FileDiscovery readContent', () => {
  let discovery: FileDiscovery;
  let tempDir: string;

  function createFile(relativePath: string, content = ''): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  beforeEach(() => {
    discovery = new FileDiscovery();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads file content', async () => {
    const content = 'export const greeting = "hello";';
    createFile('app.ts', content);

    const result = await discovery.discover({ rootPath: tempDir });

    await expect(discovery.readContent(result.files[0])).resolves.toBe(content);
  });

  it('reads utf-8 content', async () => {
    const content = 'const emoji = "🎉"; // Unicode test';
    createFile('emoji.ts', content);

    const result = await discovery.discover({ rootPath: tempDir });

    await expect(discovery.readContent(result.files[0])).resolves.toBe(content);
  });
});

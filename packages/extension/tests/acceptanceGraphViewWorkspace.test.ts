import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  copyExampleWorkspace,
  copyExampleTypescriptWorkspace,
  readExampleWorkspaceFiles,
} from './acceptance/graphView/workspace';

describe('acceptance graph view workspace fixtures', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes settings for the relationships asserted by acceptance scenarios', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeVSCodeSettings: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
    const files = readExampleWorkspaceFiles(workspacePath);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
      plugins?: Array<{ package?: string }>;
      respectGitignore?: boolean;
    };

    expect(files).toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
    expect(settings.respectGitignore).toBe(false);
    expect(settings.edgeVisibility).toEqual(expect.objectContaining({
      import: true,
      'type-import': false,
      call: false,
      inherit: true,
      reference: true,
      load: true,
    }));
    expect(settings.plugins).toEqual([
      { package: '@codegraphy-dev/plugin-markdown' },
    ]);
  });

  it('omits VS Code settings from TypeScript fixtures unless the scenario asserts that node', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot);
    const files = readExampleWorkspaceFiles(workspacePath);

    expect(files).not.toContain('.vscode/settings.json');
    expect(files).toContain('.gitignore');
  });

  it('can expose TypeScript type import edges for scenarios that assert the extra connection', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleTypescriptWorkspace(tempRoot, {
      includeTypeImportEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.['type-import']).toBe(true);
  });

  it('can expose call edges for language scenarios that assert imported-call connections', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-go', {
      includeCallEdges: true,
    });
    const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      edgeVisibility?: Record<string, boolean>;
    };

    expect(settings.edgeVisibility?.call).toBe(true);
  });

  it('rewrites markdown example links for the copied workspace root', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-acceptance-fixture-'));
    tempRoots.push(tempRoot);

    const workspacePath = copyExampleWorkspace(tempRoot, 'example-markdown');
    const homePath = path.join(workspacePath, 'notes/Home.md');
    const commentedPath = path.join(workspacePath, 'src/commented.ts');
    const homeContent = fs.readFileSync(homePath, 'utf8');
    const commentedContent = fs.readFileSync(commentedPath, 'utf8');

    expect(homeContent).toContain('[[notes/Architecture.md]]');
    expect(homeContent).toContain('![[notes/assets/Diagram.md]]');
    expect(homeContent).toContain('[[src/commented.ts]]');
    expect(homeContent).toContain('[[example-markdown/notes/guides/Setup.md|Setup Guide]]');
    expect(commentedContent).toContain('[[notes/Architecture.md]]');
  });
});

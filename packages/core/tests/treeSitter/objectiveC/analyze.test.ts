import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-objc-'));
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

describe('treeSitter/analyzeObjectiveC', () => {
  it('extracts Objective-C imports, class/protocol symbols, and method symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'Sources/Feature/UserCard.h': [
        '#import <Foundation/Foundation.h>',
        '@protocol Renderable',
        '- (NSString *)renderTitle;',
        '@end',
        '@interface UserCard : NSObject <Renderable>',
        '- (void)configureWithName:(NSString *)name;',
        '@end',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'Sources/AppDelegate.m');
    const source = [
      '#import "Feature/UserCard.h"',
      '',
      '@interface AppDelegate : NSObject',
      '- (void)applicationDidFinishLaunching;',
      '@end',
      '',
      '@implementation AppDelegate',
      '- (void)applicationDidFinishLaunching {',
      '  UserCard *card = [UserCard new];',
      '  [card configureWithName:@"Ada"];',
      '}',
      '@end',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'codegraphy.treesitter:include',
        specifier: 'Feature/UserCard.h',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Feature/UserCard.h'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'class', name: 'AppDelegate' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'applicationDidFinishLaunching' }),
    ]));
  });
});

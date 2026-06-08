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
        sourceId: 'core:treesitter:include',
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

  it('extracts Objective-C header inheritance and protocol conformance', async () => {
    const workspaceRoot = await createWorkspace({
      'Sources/Feature/AppView.h': [
        '#import <Foundation/Foundation.h>',
        '@interface AppView : NSObject',
        '@end',
      ].join('\n'),
      'Sources/Feature/ProfileRenderable.h': [
        '#import <Foundation/Foundation.h>',
        '@protocol ProfileRenderable',
        '@end',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'Sources/Feature/UserCardView.h');
    const source = [
      '#import <Foundation/Foundation.h>',
      '#import "AppView.h"',
      '#import "ProfileRenderable.h"',
      '',
      '@interface UserCardView : AppView <ProfileRenderable>',
      '- (void)renderProfile;',
      '@end',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'AppView',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Feature/AppView.h'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'ProfileRenderable',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Feature/ProfileRenderable.h'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'class', name: 'UserCardView' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'renderProfile' }),
    ]));
  });

  it('extracts Objective-C call relationships from imported class and typed receiver messages', async () => {
    const workspaceRoot = await createWorkspace({
      'Sources/Data/SessionStore.h': [
        '@interface SessionStore : NSObject',
        '+ (instancetype)demoStore;',
        '@end',
      ].join('\n'),
      'Sources/Feature/UserCardView.h': [
        '@interface UserCardView : NSObject',
        '- (void)renderProfile:(id)profile;',
        '@end',
      ].join('\n'),
      'Sources/Models/UserProfile.h': [
        '@interface UserProfile : NSObject',
        '@end',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'Sources/Controllers/DashboardController.m');
    const source = [
      '#import "../Data/SessionStore.h"',
      '#import "../Feature/UserCardView.h"',
      '#import "../Models/UserProfile.h"',
      '',
      '@interface DashboardController ()',
      '@property(nonatomic, strong) SessionStore *store;',
      '@property(nonatomic, strong) UserCardView *cardView;',
      '@end',
      '',
      '@implementation DashboardController',
      '- (void)load {',
      '  SessionStore *store = [SessionStore demoStore];',
      '  UserProfile *profile = [self.store currentUser];',
      '  _cardView = [UserCardView new];',
      '  [self.cardView renderProfile:profile];',
      '  [store currentUser];',
      '}',
      '@end',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'SessionStore',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Data/SessionStore.h'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'UserCardView',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Feature/UserCardView.h'),
      }),
    ]));
  });

  it('extracts Objective-C call relationships from nested allocation messages', async () => {
    const workspaceRoot = await createWorkspace({
      'Sources/Data/SessionStore.h': [
        '@interface SessionStore : NSObject',
        '+ (instancetype)demoStore;',
        '@end',
      ].join('\n'),
      'Sources/Models/UserProfile.h': [
        '@interface UserProfile : NSObject',
        '- (instancetype)initWithName:(NSString *)name role:(NSString *)role;',
        '@end',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'Sources/Data/SessionStore.m');
    const source = [
      '#import "SessionStore.h"',
      '#import "../Models/UserProfile.h"',
      '@implementation SessionStore',
      '+ (instancetype)demoStore {',
      '  return [SessionStore new];',
      '}',
      '- (UserProfile *)currentUser {',
      '  return [[UserProfile alloc] initWithName:@"Ada" role:@"Graph Explorer"];',
      '}',
      '@end',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'UserProfile',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Models/UserProfile.h'),
      }),
    ]));
    expect(result?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'SessionStore',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Data/SessionStore.h'),
      }),
    ]));
  });

  it('extracts Objective-C call relationships from self property receivers', async () => {
    const workspaceRoot = await createWorkspace({
      'Sources/Data/SessionStore.h': [
        '@interface SessionStore : NSObject',
        '- (id)currentUser;',
        '@end',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'Sources/Controllers/DashboardController.m');
    const source = [
      '#import "../Data/SessionStore.h"',
      '@interface DashboardController ()',
      '@property(nonatomic, strong) SessionStore *store;',
      '@end',
      '@implementation DashboardController',
      '- (void)reloadDashboard {',
      '  [self.store currentUser];',
      '}',
      '@end',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'SessionStore',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'Sources/Data/SessionStore.h'),
      }),
    ]));
  });
});

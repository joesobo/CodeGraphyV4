import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-haskell-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeHaskell', () => {
  it('extracts Haskell import relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Model/User.hs': [
        'module App.Model.User where',
        'data User = User String',
        '',
      ].join('\n'),
    });
    const runnerPath = path.join(workspaceRoot, 'src/App/Feature/Runner.hs');
    const source = [
      'module App.Feature.Runner (Runner(..), boot) where',
      '',
      'import App.Model.User',
      'import qualified Data.Text as Text',
      '',
      'data Runner = Runner User',
      '',
      'boot :: User -> Runner',
      'boot user = Runner user',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'App.Model.User',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'Data.Text',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'module', name: 'App.Feature.Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'type', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });

  it('extracts Haskell calls to imported functions and constructors', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Feature/Runner.hs': [
        'module App.Feature.Runner where',
        'boot user = user',
        '',
      ].join('\n'),
      'src/App/Model/User.hs': [
        'module App.Model.User where',
        'data User = User String',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/Main.hs');
    const source = [
      'module Main where',
      '',
      'import App.Feature.Runner',
      'import App.Model.User',
      '',
      'main :: IO ()',
      'main = print (boot (User "Ada"))',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'boot',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'src/App/Feature/Runner.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Feature/Runner.hs'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'User',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
      }),
    ]));
  });

  it('extracts generic Haskell symbols and imported type references used by the example contract', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Model/Profile.hs': [
        'module App.Model.Profile where',
        'data Profile = Profile',
        '  { profileName :: String',
        '  } deriving Show',
        '',
        'describeProfile :: Profile -> String',
        'describeProfile profile = profileName profile',
        '',
      ].join('\n'),
      'src/App/Model/User.hs': [
        'module App.Model.User where',
        'data User = User',
        '  { userName :: String',
        '  } deriving Show',
        '',
        'describeUser :: User -> String',
        'describeUser user = userName user',
        '',
      ].join('\n'),
    });
    const runnerPath = path.join(workspaceRoot, 'src/App/Feature/Runner.hs');
    const profilePath = path.join(workspaceRoot, 'src/App/Model/Profile.hs');
    const userPath = path.join(workspaceRoot, 'src/App/Model/User.hs');
    const source = [
      'module App.Feature.Runner (Greeting, Runnable(..), Runner(..), RunnerId(..), boot, renderGreeting) where',
      '',
      'import App.Model.Profile (Profile, describeProfile)',
      'import App.Model.User (User, describeUser)',
      '',
      'newtype RunnerId = RunnerId Int deriving Show',
      '',
      'data Greeting = Greeting String deriving Show',
      '',
      'defaultRunnerId :: RunnerId',
      'defaultRunnerId = RunnerId 1',
      '',
      'data Runner = Runner',
      '  { runnerId :: RunnerId',
      '  , runnerUser :: User',
      '  , runnerProfile :: Profile',
      '  } deriving Show',
      '',
      'class Runnable task where',
      '  greet :: task -> Greeting',
      '',
      'instance Runnable Runner where',
      '  greet runner = Greeting ("Hello, " ++ describeUser (runnerUser runner) ++ " the " ++ describeProfile (runnerProfile runner))',
      '',
      'boot :: User -> Profile -> Runner',
      'boot user profile = Runner defaultRunnerId user profile',
      '',
      'renderGreeting :: Runnable task => task -> String',
      'renderGreeting task =',
      '  let Greeting message = greet task',
      '      decorated = message ++ "!"',
      '  in decorated',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'type', name: 'RunnerId' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'type', name: 'Greeting' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'type', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'Runnable' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'constant', name: 'defaultRunnerId' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'field', name: 'runnerId' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'field', name: 'runnerUser' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'field', name: 'runnerProfile' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'greet' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'renderGreeting' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'parameter', name: 'runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'parameter', name: 'user' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'parameter', name: 'profile' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'parameter', name: 'task' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'local', name: 'message' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'local', name: 'decorated' }),
    ]));
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'core:treesitter:reference',
        specifier: 'Profile',
        fromFilePath: runnerPath,
        resolvedPath: profilePath,
        toFilePath: profilePath,
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'core:treesitter:reference',
        specifier: 'User',
        fromFilePath: runnerPath,
        resolvedPath: userPath,
        toFilePath: userPath,
      }),
    ]));
  });
});

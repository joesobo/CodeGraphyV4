import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const vendoredRuntimeRoot = path.join(repoRoot, 'dist', 'node_modules');
const vendoredRequire = createRequire(path.join(vendoredRuntimeRoot, 'runtime-check.js'));
const vendoredSQLitePath = path.join(vendoredRuntimeRoot, 'libsql');

const treeSitterLanguageModules = [
  { label: 'C', packageName: 'tree-sitter-c' },
  { label: 'C++', packageName: 'tree-sitter-cpp' },
  { label: 'C#', packageName: 'tree-sitter-c-sharp' },
  { label: 'Dart', packageName: '@driftlog/tree-sitter-dart' },
  { label: 'Go', packageName: 'tree-sitter-go' },
  { label: 'Haskell', packageName: 'tree-sitter-haskell' },
  { label: 'Java', packageName: 'tree-sitter-java' },
  { label: 'JavaScript', packageName: 'tree-sitter-javascript' },
  { label: 'Kotlin', packageName: '@tree-sitter-grammars/tree-sitter-kotlin' },
  {
    label: 'Lua',
    packageName: '@tree-sitter-grammars/tree-sitter-lua/bindings/node/index.js',
  },
  { label: 'Objective-C', packageName: 'tree-sitter-objc' },
  { label: 'PHP', packageName: 'tree-sitter-php', exportName: 'php' },
  { label: 'Python', packageName: 'tree-sitter-python' },
  { label: 'Ruby', packageName: 'tree-sitter-ruby' },
  { label: 'Rust', packageName: 'tree-sitter-rust' },
  { label: 'Scala', packageName: 'tree-sitter-scala' },
  { label: 'Swift', packageName: 'tree-sitter-swift' },
  { label: 'TSX', packageName: 'tree-sitter-typescript', exportName: 'tsx' },
  {
    label: 'TypeScript',
    packageName: 'tree-sitter-typescript',
    exportName: 'typescript',
  },
];

try {
  const Database = require(vendoredSQLitePath);
  const database = new Database(':memory:');
  database.exec('CREATE TABLE RuntimeCheck(value TEXT NOT NULL)');
  database.prepare('INSERT INTO RuntimeCheck(value) VALUES (?)').run('ready');
  const row = database.prepare('SELECT value FROM RuntimeCheck').get();
  database.close();
  if (row?.value !== 'ready') {
    throw new Error('SQLite query round-trip returned an unexpected value.');
  }

  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-native-runtime-'));
  try {
    const databasePath = path.join(runtimeDirectory, 'graph.sqlite');
    const writeCache = (value) => {
      const diskDatabase = new Database(databasePath);
      diskDatabase.exec('CREATE TABLE IF NOT EXISTS RuntimeCheck(value TEXT NOT NULL)');
      diskDatabase.exec('BEGIN TRANSACTION');
      try {
        diskDatabase.exec('DELETE FROM RuntimeCheck');
        diskDatabase.prepare('INSERT INTO RuntimeCheck(value) VALUES (?)').run(value);
        diskDatabase.exec('COMMIT');
      } catch (error) {
        diskDatabase.exec('ROLLBACK');
        throw error;
      } finally {
        diskDatabase.close();
      }
    };
    const readCache = () => {
      const diskDatabase = new Database(databasePath);
      try {
        return diskDatabase.prepare('SELECT value FROM RuntimeCheck').get()?.value;
      } finally {
        diskDatabase.close();
      }
    };

    writeCache('first');
    if (readCache() !== 'first') {
      throw new Error('SQLite disk round-trip returned an unexpected first value.');
    }
    writeCache('second');
    if (readCache() !== 'second') {
      throw new Error('SQLite repeated disk save returned an unexpected second value.');
    }

    fs.truncateSync(databasePath, 0);
    writeCache('reinitialized');
    if (readCache() !== 'reinitialized') {
      throw new Error('SQLite in-place cache reinitialization returned an unexpected value.');
    }
  } finally {
    try {
      fs.rmSync(runtimeDirectory, { force: true, recursive: true });
    } catch {
      // Windows can retain native statement handles until garbage collection.
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to load vendored SQLite native runtime from ${vendoredSQLitePath}: ${message}`,
  );
}

console.log(`Loaded vendored SQLite native runtime from ${vendoredSQLitePath}`);

try {
  const watcherPackageName = process.platform === 'linux'
    ? '@parcel/watcher-linux-x64-glibc'
    : process.platform === 'darwin'
      ? '@parcel/watcher-darwin-arm64'
      : '@parcel/watcher-win32-x64';
  const watcher = vendoredRequire(watcherPackageName);
  if (
    typeof watcher.subscribe !== 'function'
    || typeof watcher.unsubscribe !== 'function'
  ) {
    throw new Error('Parcel watcher binding does not expose subscribe and unsubscribe.');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to load the vendored Parcel watcher runtime: ${message}`);
}

try {
  const Parser = vendoredRequire('tree-sitter');

  for (const languageModule of treeSitterLanguageModules) {
    const modulePath = vendoredRequire.resolve(languageModule.packageName);
    const importedModule = await import(pathToFileURL(modulePath).href);
    const moduleValue = importedModule.default ?? importedModule;
    const language = languageModule.exportName
      ? moduleValue[languageModule.exportName] ?? importedModule[languageModule.exportName]
      : moduleValue;
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse('const value = 1');
    if (!tree.rootNode) {
      throw new Error(`${languageModule.label} did not return a syntax tree.`);
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to load vendored Tree-sitter runtimes: ${message}`);
}

try {
  const esbuild = vendoredRequire('esbuild');
  const result = esbuild.transformSync('const value: number = 1', { loader: 'ts' });
  if (!result.code.includes('const value = 1')) {
    throw new Error('TypeScript transform returned unexpected output.');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to run the vendored esbuild runtime: ${message}`);
}

try {
  const materialThemeRoot = path.join(vendoredRuntimeRoot, 'material-icon-theme');
  const manifestPath = path.join(materialThemeRoot, 'dist', 'material-icons.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const iconDefinition = Object.values(manifest.iconDefinitions ?? {})[0];
  const iconPath = iconDefinition?.iconPath;
  if (typeof iconPath !== 'string') {
    throw new Error('Material icon manifest has no icon definitions.');
  }

  const resolvedIconPath = path.resolve(path.dirname(manifestPath), iconPath);
  if (!fs.existsSync(resolvedIconPath)) {
    throw new Error(`Material icon is missing at ${resolvedIconPath}.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to load the vendored Material icon theme: ${message}`);
}

console.log(
  `Loaded ${treeSitterLanguageModules.length} vendored Tree-sitter languages, `
  + 'esbuild, and the Material icon theme.',
);

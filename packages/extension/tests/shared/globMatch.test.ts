import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import {
  createCombinedGlobMatcher,
  createGlobMatcher,
  globMatch,
  globToRegex,
} from '../../src/shared/globMatch';

describe('shared/globMatch', () => {
  it('matches basename patterns against nested paths', () => {
    expect(globMatch('src/player.gd', '*.gd')).toBe(true);
    expect(globMatch('src/player.ts', '*.gd')).toBe(false);
  });

  it('keeps single-star and double-star path semantics distinct', () => {
    expect(globMatch('packages/extension/src/main.ts', 'src/*')).toBe(true);
    expect(globMatch('packages/extension/src/deep/main.ts', 'src/*')).toBe(false);
    expect(globMatch('packages/extension/src/deep/main.ts', 'src/**')).toBe(true);
  });

  it('matches double-star slash patterns at zero or more nested folders', () => {
    expect(globMatch('scripts/player.gd', 'scripts/**/*.gd')).toBe(true);
    expect(globMatch('scripts/characters/player.gd', 'scripts/**/*.gd')).toBe(true);
    expect(globMatch('addons/player.gd', 'scripts/**/*.gd')).toBe(false);
  });

  it('escapes regex metacharacters in glob patterns', () => {
    expect(globMatch('src/types/api.d.ts', '*.d.ts')).toBe(true);
    expect(globMatch('src/types/apiXd.ts', '*.d.ts')).toBe(false);
    expect(globToRegex('*.d.ts')).toBeInstanceOf(RegExp);
  });

  it('creates reusable matchers with the same glob semantics', () => {
    const matcher = createGlobMatcher('src/**/*.ts');

    expect(matcher('src/index.ts')).toBe(true);
    expect(matcher('src/deep/index.ts')).toBe(true);
    expect(matcher('docs/index.ts')).toBe(false);
  });

  it('keeps repeated simple single-glob checks cheap', () => {
    const patterns = [
      '*.ts',
      '*.tsx',
      '*.json',
      '*.md',
      '*.gd',
      '*.cs',
      '*.sln',
      '*.meta',
      '*.yml',
      '*.yaml',
      '*.js',
      '*.css',
      '*.vue',
      '*.svelte',
      '*.go',
      '*.rs',
      '*.rb',
      '*.py',
      '*.java',
      '*.php',
      '*.lua',
      '*.swift',
      '*.dart',
      '*.hpp',
      '*.cpp',
      '*.c',
      '*.h',
    ];
    const matchers = patterns.flatMap((pattern) => [
      createGlobMatcher(pattern),
      createGlobMatcher(pattern),
      createGlobMatcher(pattern),
      createGlobMatcher(pattern),
    ]);
    const regexMatchers = patterns.flatMap((pattern) => {
      const regex = globToRegex(pattern);
      return [
        (filePath: string) => regex.test(filePath),
        (filePath: string) => regex.test(filePath),
        (filePath: string) => regex.test(filePath),
        (filePath: string) => regex.test(filePath),
      ];
    });
    const paths = Array.from({ length: 2_300 }, (_, index) => (
      `packages/package-${index % 100}/src/file-${index}.${index % 5 === 0 ? 'ts' : 'txt'}`
    ));

    const countMatches = (nextMatchers: Array<(filePath: string) => boolean>) => {
      let matchedCount = 0;
      for (const filePath of paths) {
        for (const matcher of nextMatchers) {
          if (matcher(filePath)) {
            matchedCount += 1;
          }
        }
      }
      return matchedCount;
    };
    countMatches(matchers);
    countMatches(regexMatchers);

    const startedAt = performance.now();
    const matchedCount = countMatches(matchers);
    const elapsedMs = performance.now() - startedAt;
    const regexStartedAt = performance.now();
    const regexMatchedCount = countMatches(regexMatchers);
    const regexElapsedMs = performance.now() - regexStartedAt;

    expect(matchedCount).toBe(1_840);
    expect(regexMatchedCount).toBe(matchedCount);
    expect(elapsedMs).toBeLessThan(50);
    expect(elapsedMs).toBeLessThan(regexElapsedMs * 0.75);
  });

  it('creates one matcher that preserves any-pattern glob semantics', () => {
    const matcher = createCombinedGlobMatcher([
      '**/tests/**',
      'reports/**',
      '*.d.ts',
    ]);

    expect(matcher('packages/extension/tests/unit.test.ts')).toBe(true);
    expect(matcher('reports/performance/latest.json')).toBe(true);
    expect(matcher('src/types/api.d.ts')).toBe(true);
    expect(matcher('src/index.ts')).toBe(false);
  });

  it('preserves direct-child path boundaries in combined matchers', () => {
    const matcher = createCombinedGlobMatcher(['src/*']);

    expect(matcher('src/index.ts')).toBe(true);
    expect(matcher('packages/extension/src/index.ts')).toBe(true);
    expect(matcher('packages/extension/src/deep/index.ts')).toBe(false);
    expect(matcher('packages/extension/xsrc/index.ts')).toBe(false);
  });

  it('falls back to glob regexes for complex combined patterns', () => {
    const matcher = createCombinedGlobMatcher([
      '**/Assets/AddressableAssetsData/**/*.bin*',
      '**/[Ll]ibrary/**',
    ]);

    expect(matcher('project/Assets/AddressableAssetsData/android/catalog.bin.hash')).toBe(true);
    expect(matcher('project/Assets/AddressableAssetsData/catalog.json')).toBe(false);
    expect(matcher('project/Library/generated.asset')).toBe(false);
    expect(matcher('project/[Ll]ibrary/generated.asset')).toBe(true);
  });

  it('creates an empty combined matcher that never matches', () => {
    const matcher = createCombinedGlobMatcher([]);

    expect(matcher('src/index.ts')).toBe(false);
  });

  it('rejects nonmatching paths quickly with many plugin default filters', () => {
    const matcher = createCombinedGlobMatcher([
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.godot/**',
      '**/.import/**',
      '**/*.import',
      '**/.mono/**',
      '**/addons/**',
      '**/*.uid',
      '**/.svelte-kit/**',
      '**/[Ll]ibrary/**',
      '**/[Tt]emp/**',
      '**/[Oo]bj/**',
      '**/[Bb]uild/**',
      '**/[Bb]uilds/**',
      '**/[Ll]ogs/**',
      '**/[Pp]roject[Ss]ettings/**',
      '**/[Uu]ser[Ss]ettings/**',
      '**/[Mm]emory[Cc]aptures/**',
      '**/.vs/**',
      '**/.gradle/**',
      '**/.idea/**',
      '**/Assets/Packages/**',
      '**/Assets/Plugins/Editor/JetBrains/**',
      '**/ExportedObj/**',
      '**/.consulo/**',
      '**/*.meta',
      '**/*.csproj',
      '**/*.unityproj',
      '**/*.sln',
      '**/*.slnx',
      '**/*.suo',
      '**/*.user',
      '**/*.userprefs',
      '**/*.pidb',
      '**/*.booproj',
      '**/*.tmp',
      '**/*.pdb',
      '**/*.mdb',
      '**/*.pidb.meta',
      '**/*.pdb.meta',
      '**/*.mdb.meta',
      '**/*.opendb',
      '**/*.VC.db',
      '**/sysinfo.txt',
      '**/crashlytics-build.properties',
      '**/Assets/AddressableAssetsData/**/*.bin*',
      '**/Assets/StreamingAssets/aa.meta',
      '**/Assets/StreamingAssets/aa/**',
    ]);
    const paths = Array.from({ length: 10_000 }, (_, index) => (
      `packages/package-${index % 100}/src/deep/file-${index}.ts`
    ));

    const startedAt = performance.now();
    const matchedCount = paths.filter(matcher).length;
    const elapsedMs = performance.now() - startedAt;

    expect(matchedCount).toBe(0);
    expect(elapsedMs).toBeLessThan(120);
  });
});

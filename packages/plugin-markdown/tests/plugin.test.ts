import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createMarkdownPlugin } from '../src/plugin';

const repoRoot = path.resolve(__dirname, '../../..');
const examplesRoot = path.join(repoRoot, 'examples');
const rootMarkdownExample = path.join(examplesRoot, 'example-markdown');

interface AnalyzeFileInput {
  absolutePath: string;
  relativePath: string;
  content: string;
}

async function analyzeRelations(
  plugin: ReturnType<typeof createMarkdownPlugin>,
  filePath: string,
  content: string,
  workspaceRoot: string,
) {
  expect(plugin.analyzeFile).toBeDefined();

  const analysis = await plugin.analyzeFile!(filePath, content, workspaceRoot);

  expect(analysis.filePath).toBe(filePath);
  return analysis.relations ?? [];
}

describe('createMarkdownPlugin', () => {
  describe('manifest fields', () => {
    it('exposes the plugin id from codegraphy.json', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.id).toBe('codegraphy.markdown');
    });

    it('exposes the plugin name from codegraphy.json', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.name).toBe('Markdown');
    });

    it('exposes the plugin version from codegraphy.json', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.version).toBe('1.0.0');
    });

    it('exposes the apiVersion from codegraphy.json', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.apiVersion).toBe('^2.0.0');
    });

    it('supports wildcard file scanning', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.supportedExtensions).toEqual(['*']);
    });

    it('exposes default filters as an empty array', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.defaultFilters).toEqual([]);
    });

    it('exposes the wikilink rule definition', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.sources).toEqual([
        { id: 'wikilink', name: 'Wikilinks', description: '[[Note Name]], ![[embed]]' },
      ]);
    });

    it('exposes file color mappings for md and mdx', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.fileColors).toEqual({
        '*.md': '#7C3AED',
        '*.mdx': '#8B5CF6',
      });
    });
  });

  describe('integration', () => {
    let workspaceA: string;
    let workspaceB: string;

    beforeEach(() => {
      workspaceA = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-markdown-a-'));
      workspaceB = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-markdown-b-'));
    });

    afterEach(() => {
      fs.rmSync(workspaceA, { recursive: true, force: true });
      fs.rmSync(workspaceB, { recursive: true, force: true });
    });

    function createMarkdownFile(workspaceRoot: string, relativePath: string): AnalyzeFileInput {
      const absolutePath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, `# ${relativePath}`);
      return { absolutePath, relativePath, content: `# ${relativePath}` };
    }

    it('returns relations from analyzeFile after initialize', async () => {
      const plugin = createMarkdownPlugin();
      const target = createMarkdownFile(workspaceA, 'docs/Guide.md');

      await plugin.initialize?.(workspaceA);
      const relations = await analyzeRelations(
        plugin,
        path.join(workspaceA, 'Current.md'),
        '[[docs/Guide]]',
        workspaceA,
      );

      expect(relations).toHaveLength(1);
      expect(relations[0].sourceId).toBe('wikilink');
      expect(relations[0].fromFilePath).toBe(path.join(workspaceA, 'Current.md'));
      expect(relations[0].resolvedPath).toBe(target.absolutePath);
    });

    it('scans wikilinks in non-markdown files', async () => {
      const plugin = createMarkdownPlugin();
      const target = createMarkdownFile(workspaceA, 'docs/Guide.md');

      await plugin.initialize?.(workspaceA);
      await plugin.onPreAnalyze?.([target], workspaceA);

      const analysis = await plugin.analyzeFile(
        path.join(workspaceA, 'src', 'component.ts'),
        'const link = "[[docs/Guide]]";',
        workspaceA,
      );

      expect(analysis.relations ?? []).toHaveLength(1);
      expect(analysis.relations?.[0]).toMatchObject({
        sourceId: 'wikilink',
        fromFilePath: path.join(workspaceA, 'src', 'component.ts'),
        resolvedPath: target.absolutePath,
      });
    });

    it('updates the workspace root when onPreAnalyze is called with a new root', async () => {
      const plugin = createMarkdownPlugin();
      const targetA = createMarkdownFile(workspaceA, 'docs/Shared.md');
      const targetB = createMarkdownFile(workspaceB, 'docs/Shared.md');

      await plugin.initialize?.(workspaceA);
      await plugin.onPreAnalyze?.([targetA], workspaceA);
      const firstPass = await analyzeRelations(
        plugin,
        path.join(workspaceA, 'Current.md'),
        '[[docs/Shared]]',
        workspaceA,
      );

      await plugin.onPreAnalyze?.([targetB], workspaceB);
      const secondPass = await analyzeRelations(
        plugin,
        path.join(workspaceB, 'Current.md'),
        '[[docs/Shared]]',
        workspaceB,
      );

      expect(firstPass.map((relation) => relation.resolvedPath)).toEqual([targetA.absolutePath]);
      expect(secondPass.map((relation) => relation.resolvedPath)).toEqual([targetB.absolutePath]);
    });

    it('rebuilds the file index when onPreAnalyze is called with new files', async () => {
      const plugin = createMarkdownPlugin();
      const targetA = createMarkdownFile(workspaceA, 'docs/Shared.md');
      const targetB = createMarkdownFile(workspaceB, 'docs/Shared.md');

      await plugin.initialize?.(workspaceA);
      await plugin.onPreAnalyze?.([targetA], workspaceA);
      const firstPass = await analyzeRelations(
        plugin,
        path.join(workspaceA, 'Current.md'),
        '[[docs/Shared.md]]',
        workspaceA,
      );

      await plugin.onPreAnalyze?.([targetB], workspaceB);
      const secondPass = await analyzeRelations(
        plugin,
        path.join(workspaceB, 'Current.md'),
        '[[docs/Shared.md]]',
        workspaceB,
      );

      expect(firstPass.map((relation) => relation.resolvedPath)).toEqual([targetA.absolutePath]);
      expect(secondPass.map((relation) => relation.resolvedPath)).toEqual([targetB.absolutePath]);
    });

    it('resolves bundled markdown example links from markdown and non-markdown files', async () => {
      const plugin = createMarkdownPlugin();
      const exampleFiles = [
        'example-markdown/notes/Home.md',
        'example-markdown/notes/Architecture.md',
        'example-markdown/notes/guides/Setup.md',
        'example-markdown/notes/assets/Diagram.md',
        'example-markdown/src/commented.ts',
      ].map((relativePath) => ({
        absolutePath: path.join(examplesRoot, relativePath),
        relativePath,
        content: fs.readFileSync(path.join(examplesRoot, relativePath), 'utf8'),
      }));

      await plugin.initialize?.(examplesRoot);
      await plugin.onPreAnalyze?.(exampleFiles, examplesRoot);

      const markdownRelations = await analyzeRelations(
        plugin,
        path.join(rootMarkdownExample, 'notes/Home.md'),
        fs.readFileSync(path.join(rootMarkdownExample, 'notes/Home.md'), 'utf8'),
        examplesRoot,
      );
      const codeRelations = await analyzeRelations(
        plugin,
        path.join(rootMarkdownExample, 'src/commented.ts'),
        fs.readFileSync(path.join(rootMarkdownExample, 'src/commented.ts'), 'utf8'),
        examplesRoot,
      );

      expect(markdownRelations.map((relation) => relation.resolvedPath)).toEqual(
        expect.arrayContaining([
          path.join(rootMarkdownExample, 'notes/Architecture.md'),
          path.join(rootMarkdownExample, 'notes/guides/Setup.md'),
          path.join(rootMarkdownExample, 'notes/assets/Diagram.md'),
          path.join(rootMarkdownExample, 'src/commented.ts'),
        ]),
      );
      expect(codeRelations.map((relation) => relation.resolvedPath)).toEqual([
        path.join(rootMarkdownExample, 'notes/Architecture.md'),
      ]);
    });

  });

});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CodeGraphyAPI, IGraphData } from '@codegraphy-vscode/plugin-api';
import { createMarkdownPlugin } from '../src';

interface AnalyzeFile {
  absolutePath: string;
  relativePath: string;
  content: string;
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

    it('supports .md and .mdx extensions', () => {
      const plugin = createMarkdownPlugin();

      expect(plugin.supportedExtensions).toEqual(['.md', '.mdx']);
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

    function createMarkdownFile(workspaceRoot: string, relativePath: string): AnalyzeFile {
      const absolutePath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, `# ${relativePath}`);
      return { absolutePath, relativePath, content: `# ${relativePath}` };
    }

    it('resolves root-relative wikilinks immediately after initialize', async () => {
      const plugin = createMarkdownPlugin();
      const target = createMarkdownFile(workspaceA, 'docs/Guide.md');

      await plugin.initialize?.(workspaceA);
      const connections = await plugin.detectConnections(
        path.join(workspaceA, 'Current.md'),
        '[[docs/Guide]]',
        workspaceA,
      );

      expect(connections).toHaveLength(1);
      expect(connections[0].resolvedPath).toBe(target.absolutePath);
    });

    it('updates the workspace root when onPreAnalyze is called with a new root', async () => {
      const plugin = createMarkdownPlugin();
      const targetA = createMarkdownFile(workspaceA, 'docs/Shared.md');
      const targetB = createMarkdownFile(workspaceB, 'docs/Shared.md');

      await plugin.initialize?.(workspaceA);
      await plugin.onPreAnalyze?.([targetA], workspaceA);
      const firstPass = await plugin.detectConnections(
        path.join(workspaceA, 'Current.md'),
        '[[docs/Shared]]',
        workspaceA,
      );

      await plugin.onPreAnalyze?.([targetB], workspaceB);
      const secondPass = await plugin.detectConnections(
        path.join(workspaceB, 'Current.md'),
        '[[docs/Shared]]',
        workspaceB,
      );

      expect(firstPass.map((conn) => conn.resolvedPath)).toEqual([targetA.absolutePath]);
      expect(secondPass.map((conn) => conn.resolvedPath)).toEqual([targetB.absolutePath]);
    });

    it('rebuilds the file index when onPreAnalyze is called with new files', async () => {
      const plugin = createMarkdownPlugin();
      const targetA = createMarkdownFile(workspaceA, 'docs/Shared.md');
      const targetB = createMarkdownFile(workspaceB, 'docs/Shared.md');

      await plugin.initialize?.(workspaceA);
      await plugin.onPreAnalyze?.([targetA], workspaceA);
      const firstPass = await plugin.detectConnections(
        path.join(workspaceA, 'Current.md'),
        '[[Shared]]',
        workspaceA,
      );

      await plugin.onPreAnalyze?.([targetB], workspaceB);
      const secondPass = await plugin.detectConnections(
        path.join(workspaceB, 'Current.md'),
        '[[Shared]]',
        workspaceB,
      );

      expect(firstPass.map((conn) => conn.resolvedPath)).toEqual([targetA.absolutePath]);
      expect(secondPass.map((conn) => conn.resolvedPath)).toEqual([targetB.absolutePath]);
    });
  });

  describe('exporter integration', () => {
    it('registers a wikilink summary exporter on load and saves the markdown summary', async () => {
      const plugin = createMarkdownPlugin();
      const dispose = vi.fn();
      const registerExporter = vi.fn(() => ({ dispose }));
      const graph: IGraphData = {
        nodes: [
          { id: 'Home.md', label: 'Home.md', color: '#ffffff' },
          { id: 'Guide.md', label: 'Guide.md', color: '#ffffff' },
          { id: 'Orphan.md', label: 'Orphan.md', color: '#ffffff' },
        ],
        edges: [
          { id: 'Home.md->Guide.md#reference', from: 'Home.md', to: 'Guide.md', kind: 'reference', sources: [] },
          { id: 'Guide.md->Home.md#reference', from: 'Guide.md', to: 'Home.md', kind: 'reference', sources: [] },
        ],
      };
      const referenceEdges = graph.edges;
      const getGraph = vi.fn(() => graph);
      const filterEdgesByKind = vi.fn((kind: IGraphData['edges'][number]['kind']) =>
        kind === 'reference' ? referenceEdges : [],
      );
      const saveExport = vi.fn(async () => undefined);

      const api = {
        registerExporter,
        getGraph,
        filterEdgesByKind,
        saveExport,
      } as unknown as CodeGraphyAPI;

      plugin.onLoad?.(api);

      expect(registerExporter).toHaveBeenCalledOnce();
      const exporter = registerExporter.mock.calls[0]?.[0];
      expect(exporter?.id).toBe('wikilink-summary');
      expect(exporter?.label).toBe('Wikilink Summary');

      await exporter?.run();

      expect(getGraph).toHaveBeenCalledOnce();
      expect(filterEdgesByKind).toHaveBeenCalledWith('reference');
      expect(saveExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'wikilink-summary.md',
          title: 'Export Wikilink Summary',
          successMessage: 'Wikilink summary exported',
        }),
      );

      const content = String(saveExport.mock.calls[0]?.[0]?.content ?? '');
      expect(content).toContain('# Wikilink Summary');
      expect(content).toContain('Most linked notes');
      expect(content).toContain('Orphan notes');
      expect(content).toContain('`Home.md`');
      expect(content).toContain('`Orphan.md`');

      plugin.onUnload?.();
      expect(dispose).toHaveBeenCalledOnce();
    });
  });
});

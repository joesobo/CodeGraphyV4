/**
 * @fileoverview GDScript (Godot) plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/godot
 */

import * as path from 'path';
import type {
  IAnalysisSymbol,
  IPlugin,
  IPluginAnalysisContext,
} from '@codegraphy-vscode/plugin-api';
import { GDScriptPathResolver } from './PathResolver';
import { detectClassNameDeclaration, normalizePath } from './parser';
import type { GDScriptFileAnalysisResult } from './analysis';
import { collectGodotProjectRoots, resolveGodotProjectRoot } from './projectRoot';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectPreload } from './sources/preload';
import { detect as detectLoad } from './sources/load';
import { detect as detectExtends } from './sources/extends';
import { detect as detectClassNameUsage } from './sources/class-name-usage';
import { detect as detectExtResource } from './sources/ext-resource';
import { detect as detectProjectSettings } from './sources/project-settings';

export { GDScriptPathResolver } from './PathResolver';
export type { IGDScriptReference, GDScriptReferenceType } from './parser';

/**
 * Built-in plugin for GDScript (Godot) files.
 *
 * Detects dependencies in Godot GDScript files and resolves
 * resource paths (res://) to workspace-relative paths.
 *
 * Supports:
 * - preload() calls (compile-time loading)
 * - load() calls (runtime loading)
 * - extends statements (script inheritance)
 * - class_name usage (type annotations, static calls)
 * - ext_resource references in `.tscn` and `.tres` text resources
 * - project resource settings in `project.godot`
 *
 * @example
 * ```typescript
 * import { createGDScriptPlugin } from './plugins/godot';
 *
 * const plugin = createGDScriptPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export interface IGDScriptAnalyzeFilePlugin extends IPlugin {
  analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<GDScriptFileAnalysisResult>;
}

export function createGDScriptPlugin(): IGDScriptAnalyzeFilePlugin {
  let resolver: GDScriptPathResolver | null = null;
  const textResourceExtensions = new Set(['.tscn', '.tres']);
  const projectSettingsExtensions = new Set(['.godot']);

  const extractResourceUid = (content: string): string | null => {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) {
        continue;
      }

      const headerMatch = trimmed.match(/^\[\s*gd_(?:scene|resource)\b.*\buid=(["'])([^"']+)\1/);
      return headerMatch?.[2] ?? null;
    }

    return null;
  };
  let projectRoots = new Set<string>();

  const extractClassNames = (content: string): string[] => {
    const classNames = new Set<string>();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const ref = detectClassNameDeclaration(lines[i], i + 1);
      if (ref) {
        classNames.add(ref.resPath);
      }
    }

    return [...classNames];
  };

  const extractClassNameSymbols = (
    content: string,
    filePath: string,
    relativeFilePath: string,
  ): IAnalysisSymbol[] => {
    const symbols: IAnalysisSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const ref = detectClassNameDeclaration(lines[i], i + 1);
      if (!ref) {
        continue;
      }

      const signature = `class_name ${ref.resPath}`;
      symbols.push({
        id: `${relativeFilePath}#${ref.resPath}:godot-class-name`,
        name: ref.resPath,
        kind: 'class',
        filePath,
        signature,
        range: {
          startLine: ref.line,
          startColumn: 1,
          endLine: ref.line,
          endColumn: signature.length + 1,
        },
        metadata: {
          language: 'gdscript',
          source: manifest.id,
          pluginKind: 'godot-class-name',
        },
      });
    }

    return symbols;
  };

  const createGDScriptSymbol = (
    relativeFilePath: string,
    filePath: string,
    kind: string,
    name: string,
    line: string,
    signature: string,
    lineNumber: number,
  ): IAnalysisSymbol => {
    return {
      id: `${relativeFilePath}#${name}:${kind}`,
      name,
      kind,
      filePath,
      signature,
      range: {
        startLine: lineNumber,
        startColumn: line.indexOf(signature) + 1,
        endLine: lineNumber,
        endColumn: line.indexOf(signature) + signature.length + 1,
      },
      metadata: {
        language: 'gdscript',
        source: manifest.id,
      },
    };
  };

  const readDeclarationText = (trimmedLine: string): string => {
    return trimmedLine.replace(/^@\w+(?:\([^)]*\))?\s+/, '');
  };

  const readDeclarationKind = (declarationText: string): string => {
    if (declarationText.startsWith('const ')) return 'constant';
    if (declarationText.startsWith('var ')) return 'variable';
    if (declarationText.startsWith('enum ')) return 'enum';
    return 'function';
  };

  const extractDeclarationSymbols = (
    content: string,
    filePath: string,
    relativeFilePath: string,
  ): IAnalysisSymbol[] => {
    const symbols: IAnalysisSymbol[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const declarationText = readDeclarationText(trimmed);
      const declaration =
        declarationText.match(/^(?:static\s+)?func\s+([A-Za-z_]\w*)\b/)
        ?? declarationText.match(/^const\s+([A-Za-z_]\w*)\b/)
        ?? declarationText.match(/^var\s+([A-Za-z_]\w*)\b/)
        ?? declarationText.match(/^enum\s+([A-Za-z_]\w*)\b/);
      if (!declaration) {
        continue;
      }

      const [, name] = declaration;
      const kind = readDeclarationKind(declarationText);
      symbols.push(createGDScriptSymbol(relativeFilePath, filePath, kind, name, line, declarationText, i + 1));
    }

    return symbols;
  };

  const analyzeFile = async (
    filePath: string,
    content: string,
    workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ): Promise<GDScriptFileAnalysisResult> => {
    if (!resolver) resolver = new GDScriptPathResolver(workspaceRoot);

    const projectRoot = resolveGodotProjectRoot(filePath, workspaceRoot, projectRoots);
    const relativeFilePath = normalizePath(path.relative(workspaceRoot, filePath));
    const ctx = { resolver, projectRoot, workspaceRoot, relativeFilePath };
    const extension = path.extname(filePath).toLowerCase();

    const relations = textResourceExtensions.has(extension)
      ? detectExtResource(content, filePath, ctx)
      : projectSettingsExtensions.has(extension)
        ? detectProjectSettings(content, filePath, ctx)
        : [
            ...detectPreload(content, filePath, ctx),
            ...detectLoad(content, filePath, ctx),
            ...detectExtends(content, filePath, ctx),
            ...detectClassNameUsage(content, filePath, ctx),
          ];

    const symbols = [
      ...extractClassNameSymbols(content, filePath, relativeFilePath),
      ...extractDeclarationSymbols(content, filePath, relativeFilePath),
    ];

    return {
      filePath,
      relations,
      ...(symbols.length > 0 ? { symbols } : {}),
    };
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,

    async initialize(workspaceRoot: string): Promise<void> {
      resolver = new GDScriptPathResolver(workspaceRoot);
      projectRoots = new Set();
      console.log('[CodeGraphy] GDScript plugin initialized');
    },

    async onPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string,
      _context?: IPluginAnalysisContext,
    ): Promise<void> {
      resolver = new GDScriptPathResolver(workspaceRoot);
      projectRoots = collectGodotProjectRoots(files.map(({ relativePath }) => relativePath));

      for (const { relativePath, content } of files) {
        // Register file for snake_case fallback resolution
        resolver.registerFile(relativePath);
        resolver.replaceFileClassNames(relativePath, extractClassNames(content));
        resolver.replaceFileResourceUid(relativePath, extractResourceUid(content));
      }

      console.log(`[CodeGraphy] GDScript class_name map: ${resolver.getClassNameMap().size} entries, ${resolver.getFileNameMap().size} files indexed`);
    },

    async onFilesChanged(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string,
      _context?: IPluginAnalysisContext,
    ): Promise<string[]> {
      if (!resolver) {
        resolver = new GDScriptPathResolver(workspaceRoot);
      }
      projectRoots = new Set([
        ...projectRoots,
        ...collectGodotProjectRoots(files.map(({ relativePath }) => relativePath)),
      ]);

      let requiresBroadReanalysis = false;
      let requiresTextResourceReanalysis = false;

      for (const { relativePath, content } of files) {
        resolver.registerFile(relativePath);
        const { changed } = resolver.replaceFileClassNames(relativePath, extractClassNames(content));
        requiresBroadReanalysis ||= changed;
        const { changed: uidChanged } = resolver.replaceFileResourceUid(relativePath, extractResourceUid(content));
        requiresTextResourceReanalysis ||= uidChanged;
      }

      if (!requiresBroadReanalysis && !requiresTextResourceReanalysis) {
        return [];
      }

      return [
        ...(requiresBroadReanalysis
          ? resolver.getRegisteredFiles().filter((filePath) => filePath.endsWith('.gd'))
          : []),
        ...(requiresTextResourceReanalysis ? resolver.getRegisteredTextResourceFiles() : []),
      ];
    },

    analyzeFile,

    onUnload(): void {
      resolver?.clearClassNames();
      resolver = null;
      projectRoots = new Set();
    },
  };
}

// Default export for convenience
export default createGDScriptPlugin;

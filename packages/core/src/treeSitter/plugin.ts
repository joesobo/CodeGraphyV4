import type {
  IAnalysisFile,
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-dev/plugin-api';
import { analyzeFileWithTreeSitter } from './runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from './runtime/csharpIndex';
import { TREE_SITTER_SUPPORTED_EXTENSIONS } from './runtime/languages';

export function createTreeSitterPlugin(): IPlugin {
  const plugin: IPlugin = {
    id: 'codegraphy.treesitter',
    name: 'Tree-sitter',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [...TREE_SITTER_SUPPORTED_EXTENSIONS],
    contributeEdgeTypeCapabilities: () => [
      'import',
      'reference',
      'call',
      'reexport',
      'type-import',
      'inherit',
    ],

    async analyzeFile(
      filePath: string,
      content: string,
      workspaceRoot: string,
      context,
    ): Promise<IFileAnalysisResult> {
      const options = context?.features?.symbols === false
        ? { includeSymbols: false }
        : undefined;
      const analysis = options
        ? await analyzeFileWithTreeSitter(filePath, content, workspaceRoot, options)
        : await analyzeFileWithTreeSitter(filePath, content, workspaceRoot);

      return analysis ?? {
        filePath,
        edgeTypes: [],
        nodeTypes: [],
        nodes: [],
        relations: [],
        symbols: [],
      };
    },

    async onPreAnalyze(files: IAnalysisFile[], workspaceRoot: string): Promise<void> {
      await preAnalyzeCSharpTreeSitterFiles(files, workspaceRoot);
    },
  };

  return plugin;
}

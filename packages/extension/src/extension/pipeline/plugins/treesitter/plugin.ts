import type {
  IAnalysisFile,
  IFileAnalysisResult,
  IPlugin,
} from '../../../../core/plugins/types/contracts';
import { analyzeFileWithTreeSitter } from './runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from './runtime/csharpIndex';
import { TREE_SITTER_SUPPORTED_EXTENSIONS } from './runtime/languages';

const TREE_SITTER_FILE_COLORS: IPlugin['fileColors'] = {
  '*.java': '#E76F00',
  '*.rs': '#DEA584',
  '*.go': '#00ADD8',
};

export function createTreeSitterPlugin(): IPlugin {
  const plugin: IPlugin = {
    id: 'codegraphy.treesitter',
    name: 'Tree-sitter',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [...TREE_SITTER_SUPPORTED_EXTENSIONS],
    fileColors: TREE_SITTER_FILE_COLORS,

    async analyzeFile(
      filePath: string,
      content: string,
      workspaceRoot: string,
    ): Promise<IFileAnalysisResult> {
      return await analyzeFileWithTreeSitter(filePath, content, workspaceRoot) ?? {
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

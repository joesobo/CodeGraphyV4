import type {
  IPlugin,
  IPluginAnalysisContext,
} from '@codegraphy/plugin-api';
import type { GDScriptPathResolver } from '../PathResolver';
import type { GDScriptFileAnalysisResult } from '../analysis';

export interface IGDScriptAnalyzeFilePlugin extends IPlugin {
  analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<GDScriptFileAnalysisResult>;
}

export interface GodotWorkspaceFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export interface GodotAnalysisContext {
  resolver: GDScriptPathResolver;
  projectRoot?: string;
  workspaceRoot: string;
  relativeFilePath: string;
}

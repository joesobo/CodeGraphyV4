import type Parser from 'tree-sitter';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  emitActivePerfMetric,
  isPerfMetricCollectionActive,
} from '../../diagnostics/perfMetrics';
import { analyzeCFile } from './analyzeC/file';
import { analyzeCppFile } from './analyzeCpp/file';
import { analyzeCSharpFile } from './analyzeCSharp/file';
import { analyzeDartFile } from './analyzeDart/file';
import { analyzeGoFile } from './analyzeGo/file';
import { analyzeHaskellFile } from './analyzeHaskell/file';
import { analyzeJavaFile } from './analyzeJava/file';
import { analyzeJavaScriptFamilyFile } from './analyzeJavaScript/file';
import { analyzeKotlinFile } from './analyzeKotlin/file';
import { analyzeLuaFile } from './analyzeLua/file';
import { analyzeObjectiveCFile } from './analyzeObjectiveC/file';
import { analyzePascalTextFile } from './analyzePascal/file';
import { analyzePhpFile } from './analyzePhp/file';
import { analyzePythonFile } from './analyzePython/file';
import { analyzeRubyFile } from './analyzeRuby/file';
import { analyzeRustFile } from './analyzeRust/file';
import { analyzeScalaFile } from './analyzeScala/file';
import { analyzeSwiftFile } from './analyzeSwift/file';
import {
  createTreeSitterRuntime,
} from './languages/parser';
import type { TreeSitterAnalysisOptions } from './options';

type TreeSitterFileAnalyzer = (
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions,
) => IFileAnalysisResult | null;

const TREE_SITTER_FILE_ANALYZERS: Record<string, TreeSitterFileAnalyzer> = {
  'c': analyzeCFile,
  cpp: analyzeCppFile,
  csharp: analyzeCSharpFile,
  dart: analyzeDartFile,
  go: analyzeGoFile,
  haskell: analyzeHaskellFile,
  java: analyzeJavaFile,
  javascript: analyzeJavaScriptFamilyFile,
  kotlin: analyzeKotlinFile,
  lua: analyzeLuaFile,
  objectiveC: analyzeObjectiveCFile,
  php: analyzePhpFile,
  python: analyzePythonFile,
  ruby: analyzeRubyFile,
  rust: analyzeRustFile,
  scala: analyzeScalaFile,
  swift: analyzeSwiftFile,
  tsx: analyzeJavaScriptFamilyFile,
  typescript: analyzeJavaScriptFamilyFile,
};

function shouldAnalyzeHeaderAsObjectiveC(filePath: string, content: string): boolean {
  return filePath.toLowerCase().endsWith('.h')
    && /^\s*@(interface|protocol|implementation)\b/m.test(content);
}

function parseTreeSitterContent(
  parser: Parser,
  content: string,
  languageKind: string,
): Parser.Tree {
  if (!isPerfMetricCollectionActive()) {
    return parser.parse(content);
  }

  const startedAt = performance.now();
  const tree = parser.parse(content);
  emitActivePerfMetric({
    metric: 'treeSitterParseMs',
    value: performance.now() - startedAt,
    unit: 'ms',
    dimension: languageKind,
  });
  return tree;
}

export async function analyzeFileWithTreeSitter(
  filePath: string,
  content: string,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): Promise<IFileAnalysisResult | null> {
  if (filePath.toLowerCase().endsWith('.pas')) {
    return analyzePascalTextFile(filePath, content, workspaceRoot, options);
  }

  const runtime = await createTreeSitterRuntime(
    shouldAnalyzeHeaderAsObjectiveC(filePath, content) ? `${filePath}.m` : filePath,
  );
  if (!runtime) {
    return null;
  }

  const tree = parseTreeSitterContent(runtime.parser, content, runtime.languageKind);
  return analyzeTreeSitterTree(filePath, tree, workspaceRoot, runtime.languageKind, options);
}

export function analyzeTreeSitterTree(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  languageKind: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult | null {
  const analyzeLanguage = TREE_SITTER_FILE_ANALYZERS[languageKind];
  if (!analyzeLanguage) {
    return null;
  }

  return analyzeLanguage(filePath, tree, workspaceRoot, options);
}

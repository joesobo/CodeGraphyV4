import type Parser from 'tree-sitter';
import type { IFileAnalysisResult } from '../../../../../core/plugins/types/contracts';
import { analyzeCSharpFile } from './analyzeCSharp/analyze';
import { analyzeGoFile } from './analyzeGo/analyze';
import { analyzeJavaFile } from './analyzeJava/analyze';
import { analyzeJavaScriptFamilyFile } from './analyzeJavaScript/analyze';
import { analyzePythonFile } from './analyzePython/analyze';
import { analyzeRustFile } from './analyzeRust/analyze';
import {
  createTreeSitterRuntime,
} from './languages/parser';
const JAVASCRIPT_FAMILY_LANGUAGE_KINDS = new Set([
  'javascript',
  'tsx',
  'typescript',
]);

export async function analyzeFileWithTreeSitter(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult | null> {
  const runtime = await createTreeSitterRuntime(filePath);
  if (!runtime) {
    return null;
  }

  const tree = runtime.parser.parse(content);
  return analyzeTreeSitterTree(filePath, tree, workspaceRoot, runtime.languageKind);
}

function analyzeTreeSitterTree(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  languageKind: string,
): IFileAnalysisResult | null {
  if (languageKind === 'rust') {
    return analyzeRustFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'csharp') {
    return analyzeCSharpFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'go') {
    return analyzeGoFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'java') {
    return analyzeJavaFile(filePath, tree);
  }

  if (JAVASCRIPT_FAMILY_LANGUAGE_KINDS.has(languageKind)) {
    return analyzeJavaScriptFamilyFile(filePath, tree);
  }

  if (languageKind === 'python') {
    return analyzePythonFile(filePath, tree, workspaceRoot);
  }

  return null;
}

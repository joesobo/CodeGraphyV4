import type Parser from 'tree-sitter';
import type { IFileAnalysisResult } from '../../../../../core/plugins/types/contracts';
import { analyzeCFile } from './analyzeC/file';
import { analyzeCppFile } from './analyzeCpp/file';
import { analyzeCSharpFile } from './analyzeCSharp/file';
import { analyzeGoFile } from './analyzeGo/file';
import { analyzeHaskellFile } from './analyzeHaskell/file';
import { analyzeJavaFile } from './analyzeJava/file';
import { analyzeJavaScriptFamilyFile } from './analyzeJavaScript/file';
import { analyzeKotlinFile } from './analyzeKotlin/file';
import { analyzeLuaFile } from './analyzeLua/file';
import { analyzePhpFile } from './analyzePhp/file';
import { analyzePythonFile } from './analyzePython/file';
import { analyzeRubyFile } from './analyzeRuby/file';
import { analyzeRustFile } from './analyzeRust/file';
import { analyzeSwiftFile } from './analyzeSwift/file';
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
  if (languageKind === 'c') {
    return analyzeCFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'cpp') {
    return analyzeCppFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'rust') {
    return analyzeRustFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'csharp') {
    return analyzeCSharpFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'go') {
    return analyzeGoFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'haskell') {
    return analyzeHaskellFile(filePath, tree);
  }

  if (languageKind === 'java') {
    return analyzeJavaFile(filePath, tree);
  }

  if (languageKind === 'kotlin') {
    return analyzeKotlinFile(filePath, tree);
  }

  if (languageKind === 'php') {
    return analyzePhpFile(filePath, tree);
  }

  if (languageKind === 'lua') {
    return analyzeLuaFile(filePath, tree, workspaceRoot);
  }

  if (JAVASCRIPT_FAMILY_LANGUAGE_KINDS.has(languageKind)) {
    return analyzeJavaScriptFamilyFile(filePath, tree);
  }

  if (languageKind === 'python') {
    return analyzePythonFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'ruby') {
    return analyzeRubyFile(filePath, tree, workspaceRoot);
  }

  if (languageKind === 'swift') {
    return analyzeSwiftFile(filePath, tree);
  }

  return null;
}

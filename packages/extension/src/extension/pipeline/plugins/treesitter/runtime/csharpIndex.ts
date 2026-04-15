export { preAnalyzeCSharpTreeSitterFiles, type PreAnalyzeFileInput } from './csharpIndex/analyze';
export { indexCSharpTree } from './csharpIndex/indexTree';
export {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  getCSharpNodeText,
  isCSharpTypeDeclarationNode,
} from './csharpIndex/nodes';
export {
  resolveCSharpTypePath,
  resolveCSharpTypePathInNamespace,
} from './csharpIndex/resolve';
export {
  clearCSharpWorkspaceIndex,
  createEmptyCSharpIndex,
  getCSharpWorkspaceIndex,
  setCSharpWorkspaceIndex,
  type CSharpIndexedType,
  type CSharpWorkspaceIndex,
} from './csharpIndex/store';

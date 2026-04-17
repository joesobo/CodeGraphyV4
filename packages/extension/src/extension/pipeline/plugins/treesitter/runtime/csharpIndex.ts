import {
  preAnalyzeCSharpTreeSitterFiles as preAnalyzeFiles,
  type PreAnalyzeFileInput,
} from './csharpIndex/analyze';
import { indexCSharpTree as indexTree } from './csharpIndex/analyze/tree';
import {
  getCSharpFileScopedNamespaceName as getFileScopedNamespaceName,
  getCSharpIdentifierText as getIdentifierText,
  getCSharpNamespaceName as getNamespaceName,
  getCSharpNodeText as getNodeText,
  isCSharpTypeDeclarationNode as isTypeDeclarationNode,
} from './csharpIndex/analyze/nodes';
import {
  resolveCSharpTypePath as resolveTypePath,
  resolveCSharpTypePathInNamespace as resolveTypePathInNamespace,
} from './csharpIndex/resolve';
import {
  clearCSharpWorkspaceIndex as clearWorkspaceIndex,
  createEmptyCSharpIndex as createEmptyIndex,
  getCSharpWorkspaceIndex as getWorkspaceIndex,
  setCSharpWorkspaceIndex as setWorkspaceIndex,
  type CSharpIndexedType,
  type CSharpWorkspaceIndex,
} from './csharpIndex/store';

export type { PreAnalyzeFileInput, CSharpIndexedType, CSharpWorkspaceIndex };
export const preAnalyzeCSharpTreeSitterFiles = preAnalyzeFiles;
export const indexCSharpTree = indexTree;
export const getCSharpFileScopedNamespaceName = getFileScopedNamespaceName;
export const getCSharpIdentifierText = getIdentifierText;
export const getCSharpNamespaceName = getNamespaceName;
export const getCSharpNodeText = getNodeText;
export const isCSharpTypeDeclarationNode = isTypeDeclarationNode;
export const resolveCSharpTypePath = resolveTypePath;
export const resolveCSharpTypePathInNamespace = resolveTypePathInNamespace;
export const clearCSharpWorkspaceIndex = clearWorkspaceIndex;
export const createEmptyCSharpIndex = createEmptyIndex;
export const getCSharpWorkspaceIndex = getWorkspaceIndex;
export const setCSharpWorkspaceIndex = setWorkspaceIndex;

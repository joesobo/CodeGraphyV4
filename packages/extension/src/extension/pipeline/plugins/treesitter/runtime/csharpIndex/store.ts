export interface CSharpIndexedType {
  filePath: string;
  namespaceName: string | null;
  typeName: string;
}

export interface CSharpWorkspaceIndex {
  typesByQualifiedName: Map<string, CSharpIndexedType>;
}

const csharpIndexes = new Map<string, CSharpWorkspaceIndex>();

export function createEmptyCSharpIndex(): CSharpWorkspaceIndex {
  return {
    typesByQualifiedName: new Map(),
  };
}

export function clearCSharpWorkspaceIndex(workspaceRoot: string): void {
  csharpIndexes.delete(workspaceRoot);
}

export function getCSharpWorkspaceIndex(
  workspaceRoot: string,
): CSharpWorkspaceIndex | undefined {
  return csharpIndexes.get(workspaceRoot);
}

export function setCSharpWorkspaceIndex(
  workspaceRoot: string,
  index: CSharpWorkspaceIndex,
): void {
  csharpIndexes.set(workspaceRoot, index);
}

export interface CSharpWalkState {
  currentBaseTypePaths?: readonly string[];
  currentNamespace: string | null;
  currentSymbolId?: string;
}

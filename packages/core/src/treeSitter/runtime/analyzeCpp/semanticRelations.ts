import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { walkTree } from '../analyze/walk';
import { addCppCallRelation } from './relation/call/add';
import { readCppIncludedDeclarations } from './relation/include/read';
import { CPP_TYPE_NODE_TYPES } from './relation/model';
import { addCppTypeRelations } from './relation/type/apply';

export function addCppSemanticRelations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbolsEnabled: boolean,
): void {
  const includedDeclarations = readCppIncludedDeclarations(rootNode, filePath, workspaceRoot, relations);

  walkTree(rootNode, {}, (node) => {
    if (node.type === 'call_expression') {
      addCppCallRelation(node, filePath, relations, includedDeclarations, symbolsEnabled);
      return;
    }

    if (!CPP_TYPE_NODE_TYPES.has(node.type)) {
      return;
    }

    addCppTypeRelations(node, filePath, relations, includedDeclarations, symbolsEnabled);
    return { skipChildren: true };
  });
}

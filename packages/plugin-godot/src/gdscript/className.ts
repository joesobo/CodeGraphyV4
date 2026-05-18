import type { IGDScriptReference } from './types';
import { stripGDScriptComment } from './comments';
import {
  findGDScriptSyntaxNodes,
  parseGDScriptSyntaxTree,
  readFirstDescendantText,
  readGDScriptLineNumber,
} from './syntaxTree';
import { isLeadingClassNameStatement } from './classNameLine';

/**
 * Detect class_name declarations (not imports -- used for building the class_name map).
 */
export function detectClassNameDeclaration(line: string, lineNumber: number): IGDScriptReference | null {
  const match = stripGDScriptComment(line).trim().match(/^class_name\s+(\w+)/);
  if (match) {
    return {
      resPath: match[1],
      referenceType: 'class_name',
      importType: 'static',
      line: lineNumber,
      isDeclaration: true,
    };
  }
  return null;
}

export function extractGDScriptClassNameDeclarations(content: string): IGDScriptReference[] {
  const declarations: IGDScriptReference[] = [];
  const tree = parseGDScriptSyntaxTree(content);

  for (const node of findGDScriptSyntaxNodes(tree, 'ClassNameStatement')) {
    if (!isLeadingClassNameStatement(content, node.from)) {
      continue;
    }

    const className = readFirstDescendantText(node, 'Identifier');
    if (!className) {
      continue;
    }

    declarations.push({
      resPath: className,
      referenceType: 'class_name',
      importType: 'static',
      line: readGDScriptLineNumber(content, node.from),
      isDeclaration: true,
    });
  }

  return declarations;
}

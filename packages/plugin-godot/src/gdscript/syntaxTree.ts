import { parser as gdscriptParser } from '@gdquest/lezer-gdscript';

export interface GDScriptSyntaxNode {
  name: string;
  from: number;
  to: number;
  text: string;
  children: GDScriptSyntaxNode[];
}

export function parseGDScriptSyntaxTree(content: string): GDScriptSyntaxNode {
  const tree = gdscriptParser.parse(content);

  function readNode(cursor: ReturnType<typeof tree.cursor>): GDScriptSyntaxNode {
    const node: GDScriptSyntaxNode = {
      name: cursor.name,
      from: cursor.from,
      to: cursor.to,
      text: content.slice(cursor.from, cursor.to),
      children: [],
    };

    if (cursor.firstChild()) {
      do {
        node.children.push(readNode(cursor));
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return node;
  }

  return readNode(tree.cursor());
}

export function findGDScriptSyntaxNodes(
  root: GDScriptSyntaxNode,
  name: string,
): GDScriptSyntaxNode[] {
  const matches: GDScriptSyntaxNode[] = [];

  function visit(node: GDScriptSyntaxNode): void {
    if (node.name === name) {
      matches.push(node);
    }
    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return matches;
}

export function readFirstDescendantText(
  root: GDScriptSyntaxNode,
  name: string,
): string | null {
  if (root.name === name) {
    return root.text;
  }

  for (const child of root.children) {
    const text = readFirstDescendantText(child, name);
    if (text !== null) {
      return text;
    }
  }

  return null;
}

export function readGDScriptLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length;
}

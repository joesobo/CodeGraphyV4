import * as fs from 'node:fs';
import * as path from 'node:path';
import KotlinLanguage from '@tree-sitter-grammars/tree-sitter-kotlin';
import Parser from 'tree-sitter';

export function readKotlinPackageFiles(packageDirectory: string): string[] {
  try {
    return fs.readdirSync(packageDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.kt'))
      .map(entry => path.join(packageDirectory, entry.name));
  } catch {
    return [];
  }
}

export function readKotlinRootNode(filePath: string): Parser.SyntaxNode | null {
  try {
    const parser = new Parser();
    parser.setLanguage(KotlinLanguage as unknown as Parser.Language);
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}

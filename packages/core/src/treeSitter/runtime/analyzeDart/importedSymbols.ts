import * as fs from 'node:fs';
import DartLanguage from '@driftlog/tree-sitter-dart';
import Parser from 'tree-sitter';
import { getDartImportedSymbolKind } from './symbolRegistration';

export interface DartImportedSymbol {
  kind: string;
  name: string;
}

export function readDartSymbols(filePath: string): DartImportedSymbol[] {
  try {
    const parser = new Parser();
    parser.setLanguage(DartLanguage as unknown as Parser.Language);
    return collectDartSymbols(parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode);
  } catch {
    return [];
  }
}

function collectDartSymbols(rootNode: Parser.SyntaxNode): DartImportedSymbol[] {
  const symbols = new Map<string, string>();
  for (const node of rootNode.descendantsOfType([
    'class_definition',
    'enum_declaration',
    'extension_declaration',
    'function_signature',
    'mixin_declaration',
    'type_alias',
  ])) {
    addDartImportedSymbol(symbols, node);
  }
  return [...symbols].map(([name, kind]) => ({ kind, name }));
}

function addDartImportedSymbol(symbols: Map<string, string>, node: Parser.SyntaxNode): void {
  if (node.type === 'function_signature' && node.parent?.type !== 'program') return;
  const name = node.childForFieldName('name')?.text
    ?? node.namedChildren.find(child => child.type === 'identifier' || child.type === 'type_identifier')?.text;
  if (name) symbols.set(name, getDartImportedSymbolKind(node));
}

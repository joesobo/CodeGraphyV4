import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import HaskellLanguage from 'tree-sitter-haskell';
import type { HaskellModuleNames } from './importModel';

export function readImportedHaskellModuleNames(filePath: string): HaskellModuleNames {
  try {
    const parser = new Parser();
    parser.setLanguage(HaskellLanguage as unknown as Parser.Language);
    return collectHaskellModuleNames(parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode);
  } catch {
    return emptyHaskellModuleNames();
  }
}

function collectHaskellModuleNames(rootNode: Parser.SyntaxNode): HaskellModuleNames {
  const names = emptyHaskellModuleNames();
  for (const node of rootNode.descendantsOfType(['data_type', 'newtype', 'type_synonym', 'class'])) {
    addHaskellTypeNames(names, node);
  }
  for (const node of rootNode.descendantsOfType('function')) {
    const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
    if (name) names.callableNames.add(name);
  }
  return names;
}

function addHaskellTypeNames(names: HaskellModuleNames, node: Parser.SyntaxNode): void {
  const typeName = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
  if (!typeName) return;
  names.typeNames.add(typeName);
  for (const constructorName of readHaskellConstructorNames(node)) {
    names.callableNames.add(constructorName);
    const constructors = names.constructorNamesByType.get(typeName) ?? new Set<string>();
    constructors.add(constructorName);
    names.constructorNamesByType.set(typeName, constructors);
  }
}

function emptyHaskellModuleNames(): HaskellModuleNames {
  return { callableNames: new Set(), constructorNamesByType: new Map(), typeNames: new Set() };
}

function readHaskellConstructorNames(node: Parser.SyntaxNode): string[] {
  return node.descendantsOfType('constructor')
    .map(constructorNode => constructorNode.text)
    .filter((name, index, names) => names.indexOf(name) === index);
}

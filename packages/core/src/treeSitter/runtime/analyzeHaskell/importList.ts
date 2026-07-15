import type Parser from 'tree-sitter';
import type { HaskellImportList } from './importModel';

export function readHaskellImportList(node: Parser.SyntaxNode): HaskellImportList | undefined {
  const importListNode = node.childForFieldName('names');
  if (!importListNode) return undefined;
  const importList = createHaskellImportList();
  for (const importName of importListNode.namedChildren.filter(child => child.type === 'import_name')) {
    addHaskellImportName(importList, importName);
  }
  return importList;
}

function createHaskellImportList(): HaskellImportList {
  return {
    callableNames: new Set(),
    constructorNames: new Set(),
    typeNames: new Set(),
    typesWithConstructors: new Set(),
  };
}

function addHaskellImportName(importList: HaskellImportList, importName: Parser.SyntaxNode): void {
  const variableName = importName.childForFieldName('variable')?.text;
  if (variableName) importList.callableNames.add(variableName);
  const childrenNode = importName.childForFieldName('children');
  const typeName = importName.childForFieldName('type')?.text ?? importName.childForFieldName('name')?.text;
  if (!typeName) return;
  importList.typeNames.add(typeName);
  if (childrenNode?.text.includes('..')) importList.typesWithConstructors.add(typeName);
  for (const constructor of childrenNode?.descendantsOfType('constructor') ?? []) {
    importList.constructorNames.add(constructor.text);
  }
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../core/plugins/types/contracts';
import {
  createTreeSitterRuntime,
  TREE_SITTER_SOURCE_IDS,
} from './languages';
import {
  resolveCSharpTypePath,
  resolveCSharpTypePathInNamespace,
} from './csharpIndex';
import {
  getPythonSearchRoots,
  getRustCrateRoot,
  resolveGoPackagePath,
  resolveJavaSourceRoot,
  resolveJavaTypePath,
} from './projectRoots';
import { resolveTreeSitterImportPath } from './resolve';

interface ImportedBinding {
  importedName?: string;
  resolvedPath: string | null;
  specifier: string;
}

function createRange(node: Parser.SyntaxNode): IAnalysisRange {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function createSymbolId(
  filePath: string,
  kind: string,
  name: string,
  signature?: string,
): string {
  return signature
    ? `${filePath}:${kind}:${name}:${signature}`
    : `${filePath}:${kind}:${name}`;
}

function createSymbol(
  filePath: string,
  kind: string,
  name: string,
  node: Parser.SyntaxNode,
  signature?: string,
): IAnalysisSymbol {
  return {
    id: createSymbolId(filePath, kind, name, signature),
    filePath,
    kind,
    name,
    range: createRange(node),
    signature,
  };
}

function normalizeAnalysisResult(
  filePath: string,
  symbols: IAnalysisSymbol[],
  relations: IAnalysisRelation[],
): IFileAnalysisResult {
  return {
    filePath,
    relations: relations.map((relation) => ({
      ...relation,
      pluginId: 'codegraphy.treesitter',
    })),
    symbols,
  };
}

function getStringSpecifier(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'string': {
      const fragment = node.namedChildren.find((child) => child.type === 'string_fragment');
      if (fragment) {
        return fragment.text;
      }

      return node.text.length >= 2 ? node.text.slice(1, -1) : null;
    }
    case 'interpreted_string_literal': {
      const fragment = node.namedChildren.find((child) => child.type === 'interpreted_string_literal_content');
      return fragment?.text ?? null;
    }
    default:
      return null;
  }
}

function getIdentifierText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'field_identifier':
    case 'identifier':
    case 'package_identifier':
    case 'property_identifier':
    case 'type_identifier':
      return node.text;
    default:
      return null;
  }
}

function getNodeText(
  node: Parser.SyntaxNode | null | undefined,
): string | null {
  if (!node) {
    return null;
  }

  const identifier = getIdentifierText(node);
  if (identifier) {
    return identifier;
  }

  switch (node.type) {
    case 'dotted_name':
    case 'qualified_name':
    case 'relative_import':
    case 'scoped_identifier':
      return node.text;
    default:
      return null;
  }
}

function joinModuleSpecifier(
  moduleSpecifier: string,
  importedName: string,
): string {
  if (!moduleSpecifier) {
    return importedName;
  }

  return moduleSpecifier.endsWith('.')
    ? `${moduleSpecifier}${importedName}`
    : `${moduleSpecifier}.${importedName}`;
}

function getLastPathSegment(specifier: string, separator: string): string {
  const parts = specifier.split(separator).filter(Boolean);
  return parts.at(-1) ?? specifier;
}

function addRelation(
  relations: IAnalysisRelation[],
  relation: IAnalysisRelation,
): void {
  relations.push(relation);
}

function addImportRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  type?: string,
  sourceId: string = TREE_SITTER_SOURCE_IDS.import,
): void {
  addRelation(relations, {
    kind: 'import',
    sourceId,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    type,
  });
}

function addCallRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  binding: ImportedBinding,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'call',
    sourceId: TREE_SITTER_SOURCE_IDS.call,
    fromFilePath: filePath,
    fromSymbolId,
    specifier: binding.specifier,
    resolvedPath: binding.resolvedPath,
    toFilePath: binding.resolvedPath,
  });
}

function addInheritRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null = null,
): void {
  addRelation(relations, {
    kind: 'inherit',
    sourceId: TREE_SITTER_SOURCE_IDS.inherit,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

function addReferenceRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'reference',
    sourceId: TREE_SITTER_SOURCE_IDS.reference,
    fromFilePath: filePath,
    fromSymbolId,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

function findExistingFile(candidates: readonly string[]): string | null {
  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}

function resolvePythonModulePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const leadingDots = specifier.match(/^\.+/)?.[0].length ?? 0;
  const modulePath = specifier.slice(leadingDots).replace(/\./g, '/');

  const buildCandidates = (baseDirectoryPath: string): string[] => {
    if (!modulePath) {
      return [
        path.join(baseDirectoryPath, '__init__.py'),
      ];
    }

    return [
      path.join(baseDirectoryPath, `${modulePath}.py`),
      path.join(baseDirectoryPath, modulePath, '__init__.py'),
    ];
  };

  if (leadingDots > 0) {
    let baseDirectoryPath = path.dirname(filePath);
    for (let index = 1; index < leadingDots; index += 1) {
      baseDirectoryPath = path.dirname(baseDirectoryPath);
    }

    return findExistingFile(buildCandidates(baseDirectoryPath));
  }

  const searchRoots = getPythonSearchRoots(filePath, workspaceRoot);
  return findExistingFile(
    searchRoots.flatMap((searchRoot) => [
      ...buildCandidates(searchRoot),
      ...buildCandidates(path.join(searchRoot, 'src')),
    ]),
  );
}

function resolveRustModuleDeclarationPath(filePath: string, moduleName: string): string | null {
  const fileName = path.basename(filePath);
  const currentDirectoryPath = path.dirname(filePath);
  const nestedDirectoryPath = fileName === 'lib.rs' || fileName === 'main.rs' || fileName === 'mod.rs'
    ? currentDirectoryPath
    : path.join(currentDirectoryPath, fileName.replace(/\.rs$/u, ''));

  return findExistingFile([
    path.join(nestedDirectoryPath, `${moduleName}.rs`),
    path.join(nestedDirectoryPath, moduleName, 'mod.rs'),
    path.join(currentDirectoryPath, `${moduleName}.rs`),
    path.join(currentDirectoryPath, moduleName, 'mod.rs'),
  ]);
}

function resolveRustUsePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
): string | null {
  const segments = specifier.split('::').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  let baseDirectoryPath = path.dirname(filePath);
  let moduleSegments = segments;
  const crateRoot = getRustCrateRoot(filePath, workspaceRoot);

  if (segments[0] === 'crate') {
    baseDirectoryPath = path.join(crateRoot, 'src');
    moduleSegments = segments.slice(1);
  } else if (segments[0] === 'super') {
    baseDirectoryPath = path.dirname(path.dirname(filePath));
    moduleSegments = segments.slice(1);
  } else if (segments[0] === 'self') {
    moduleSegments = segments.slice(1);
  }

  for (let length = moduleSegments.length; length >= 1; length -= 1) {
    const relativePath = moduleSegments.slice(0, length).join('/');
    const resolvedPath = findExistingFile([
      path.join(baseDirectoryPath, `${relativePath}.rs`),
      path.join(baseDirectoryPath, relativePath, 'mod.rs'),
    ]);
    if (resolvedPath) {
      return resolvedPath;
    }
  }

  return null;
}

function getVariableAssignedFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
): IAnalysisSymbol | null {
  if (node.type !== 'variable_declarator') {
    return null;
  }

  const nameNode = node.childForFieldName('name') ?? node.namedChildren[0];
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  const name = getIdentifierText(nameNode);

  if (!name || !valueNode) {
    return null;
  }

  if (
    valueNode.type !== 'arrow_function'
    && valueNode.type !== 'function'
    && valueNode.type !== 'function_expression'
  ) {
    return null;
  }

  return createSymbol(filePath, 'function', name, nameNode);
}

function addNamedImportBindings(
  node: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
): void {
  for (const importSpecifier of node.namedChildren.filter((child) => child.type === 'import_specifier')) {
    const identifiers = importSpecifier.namedChildren.filter((child) =>
      child.type === 'identifier' || child.type === 'type_identifier',
    );
    const importedName = identifiers[0]?.text;
    const localName = identifiers.at(-1)?.text;
    if (!localName) {
      continue;
    }

    importedBindings.set(localName, {
      importedName,
      resolvedPath,
      specifier,
    });
  }
}

function collectImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
  importedBindings: Map<string, ImportedBinding>,
): void {
  const importClause = statement.namedChildren.find((child) => child.type === 'import_clause');
  if (!importClause) {
    return;
  }

  for (const child of importClause.namedChildren) {
    if (child.type === 'identifier') {
      importedBindings.set(child.text, {
        importedName: 'default',
        resolvedPath,
        specifier,
      });
      continue;
    }

    if (child.type === 'named_imports') {
      addNamedImportBindings(child, importedBindings, specifier, resolvedPath);
      continue;
    }

    if (child.type === 'namespace_import') {
      const localName = child.namedChildren.find((namedChild) => namedChild.type === 'identifier')?.text;
      if (localName) {
        importedBindings.set(localName, {
          importedName: '*',
          resolvedPath,
          specifier,
        });
      }
    }
  }
}

function getImportedBindingForJavaScriptCall(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const directIdentifier = getIdentifierText(calleeNode);
  if (directIdentifier) {
    return importedBindings.get(directIdentifier) ?? null;
  }

  if (calleeNode?.type !== 'member_expression') {
    return null;
  }

  const objectNode = calleeNode.childForFieldName('object') ?? calleeNode.namedChildren[0];
  const objectIdentifier = getIdentifierText(objectNode);
  return objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
}

function getCallArgumentString(callExpression: Parser.SyntaxNode): string | null {
  const argumentsNode = callExpression.childForFieldName('arguments')
    ?? callExpression.namedChildren.find((child) => child.type === 'arguments');
  const stringNode = argumentsNode?.namedChildren.find((child) =>
    child.type === 'string' || child.type === 'interpreted_string_literal',
  );
  return getStringSpecifier(stringNode);
}

function getImportRelationForJavaScriptCallExpression(
  callExpression: Parser.SyntaxNode,
  filePath: string,
): IAnalysisRelation | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const specifier = getCallArgumentString(callExpression);
  if (!specifier) {
    return null;
  }

  if (calleeNode?.type === 'import') {
    const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
    return {
      kind: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
      fromFilePath: filePath,
      specifier,
      resolvedPath,
      toFilePath: resolvedPath,
      type: 'dynamic',
    };
  }

  if (getIdentifierText(calleeNode) !== 'require') {
    return null;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  return {
    kind: 'import',
    sourceId: TREE_SITTER_SOURCE_IDS.commonjsRequire,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    type: 'require',
  };
}

interface TreeWalkAction<TContext> {
  nextContext?: TContext;
  skipChildren?: boolean;
}

interface SymbolWalkState {
  currentSymbolId?: string;
}

type TreeWalkVisitor<TContext> = (
  node: Parser.SyntaxNode,
  context: TContext,
  walk: (node: Parser.SyntaxNode, context: TContext) => void,
) => TreeWalkAction<TContext> | void;

function walkTree<TContext>(
  node: Parser.SyntaxNode,
  context: TContext,
  visit: TreeWalkVisitor<TContext>,
): void {
  const walk = (nextNode: Parser.SyntaxNode, nextContext: TContext) => {
    walkTree(nextNode, nextContext, visit);
  };
  const action = visit(node, context, walk);
  if (action?.skipChildren) {
    return;
  }

  const nextContext = action?.nextContext ?? context;
  for (const child of node.namedChildren) {
    walk(child, nextContext);
  }
}

function walkSymbolBody(
  node: Parser.SyntaxNode,
  symbolId: string,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> {
  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, { currentSymbolId: symbolId });
  }

  return { skipChildren: true };
}

function handleJavaScriptImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const specifierNode = node.namedChildren.find((child) => child.type === 'string');
  const specifier = getStringSpecifier(specifierNode);
  if (specifier) {
    const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
    collectImportBindings(node, specifier, resolvedPath, importedBindings);
    addImportRelation(relations, filePath, specifier, resolvedPath);
  }

  return { skipChildren: true };
}

function handleJavaScriptExportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const specifierNode = node.namedChildren.find((child) => child.type === 'string');
  const specifier = getStringSpecifier(specifierNode);
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  addRelation(relations, {
    kind: 'reexport',
    sourceId: TREE_SITTER_SOURCE_IDS.reexport,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

function handleJavaScriptFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'function', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function handleJavaScriptClassDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
  if (name) {
    symbols.push(createSymbol(filePath, 'class', name, node));
  }
}

function handleJavaScriptMethodDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function handleJavaScriptVariableDeclarator(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const symbol = getVariableAssignedFunctionSymbol(node, filePath);
  if (!symbol) {
    return;
  }

  symbols.push(symbol);
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  const body = valueNode?.childForFieldName('body') ?? valueNode?.namedChildren.at(-1);
  if (body) {
    walk(body, { currentSymbolId: symbol.id });
  }

  return { skipChildren: true };
}

function handleJavaScriptCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const importRelation = getImportRelationForJavaScriptCallExpression(node, filePath);
  if (importRelation) {
    relations.push(importRelation);
    return;
  }

  const binding = getImportedBindingForJavaScriptCall(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}

function visitJavaScriptNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_statement':
      return handleJavaScriptImportStatement(node, filePath, relations, importedBindings);
    case 'export_statement':
      handleJavaScriptExportStatement(node, filePath, relations);
      return;
    case 'function_declaration':
      return handleJavaScriptFunctionDeclaration(node, filePath, symbols, walk);
    case 'class_declaration':
      handleJavaScriptClassDeclaration(node, filePath, symbols);
      return;
    case 'method_definition':
      return handleJavaScriptMethodDefinition(node, filePath, symbols, walk);
    case 'variable_declarator':
      return handleJavaScriptVariableDeclarator(node, filePath, symbols, walk);
    case 'call_expression':
      handleJavaScriptCallExpression(
        node,
        filePath,
        relations,
        importedBindings,
        state.currentSymbolId,
      );
      return;
    default:
      return;
  }
}

function analyzeJavaScriptFamilyFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaScriptNode(node, state, walk, filePath, relations, symbols, importedBindings),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function getPythonCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const directIdentifier = getIdentifierText(calleeNode);
  if (directIdentifier) {
    return importedBindings.get(directIdentifier) ?? null;
  }

  if (calleeNode?.type !== 'attribute') {
    return null;
  }

  const objectNode = calleeNode.childForFieldName('object') ?? calleeNode.namedChildren[0];
  const objectIdentifier = getIdentifierText(objectNode);
  return objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
}

function handlePythonImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const moduleNodes = node.namedChildren.filter((child) =>
    child.type === 'dotted_name' || child.type === 'aliased_import',
  );
  for (const moduleNode of moduleNodes) {
    const specifier = moduleNode.type === 'aliased_import'
      ? getNodeText(moduleNode.childForFieldName('name') ?? moduleNode.namedChildren[0])
      : getNodeText(moduleNode);
    const aliasName = getIdentifierText(moduleNode.childForFieldName('alias'));
    if (!specifier) {
      continue;
    }

    const resolvedPath = resolvePythonModulePath(filePath, workspaceRoot, specifier);
    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(aliasName ?? getLastPathSegment(specifier, '.'), {
      importedName: specifier,
      resolvedPath,
      specifier,
    });
  }

  return { skipChildren: true };
}

function handlePythonImportFromStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const moduleNode = node.namedChildren.find((child) =>
    child.type === 'relative_import' || child.type === 'dotted_name',
  );
  const moduleSpecifier = getNodeText(moduleNode) ?? '';
  const importedNodes = node.namedChildren.filter((child) =>
    (child.type === 'dotted_name' || child.type === 'aliased_import') && child !== moduleNode,
  );

  if (importedNodes.length === 0) {
    if (moduleSpecifier) {
      const resolvedPath = resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier);
      addImportRelation(relations, filePath, moduleSpecifier, resolvedPath);
    }

    return { skipChildren: true };
  }

  for (const importedNode of importedNodes) {
    const importedName = importedNode.type === 'aliased_import'
      ? getNodeText(importedNode.childForFieldName('name') ?? importedNode.namedChildren[0])
      : getNodeText(importedNode);
    if (!importedName) {
      continue;
    }

    const localName = getIdentifierText(importedNode.childForFieldName('alias'))
      ?? getLastPathSegment(importedName, '.');
    const specifier = joinModuleSpecifier(moduleSpecifier, importedName);
    const resolvedPath = resolvePythonModulePath(filePath, workspaceRoot, specifier)
      ?? (moduleSpecifier
        ? resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier)
        : null);

    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(localName, {
      importedName,
      resolvedPath,
      specifier,
    });
  }

  return { skipChildren: true };
}

function handlePythonClassDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, 'class', name, node));
  }
}

function handlePythonFunctionDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.parent?.type === 'block' && node.parent.parent?.type === 'class_definition'
    ? 'method'
    : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function handlePythonCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getPythonCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}

function visitPythonNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_statement':
      return handlePythonImportStatement(
        node,
        filePath,
        workspaceRoot,
        relations,
        importedBindings,
      );
    case 'import_from_statement':
      return handlePythonImportFromStatement(
        node,
        filePath,
        workspaceRoot,
        relations,
        importedBindings,
      );
    case 'class_definition':
      handlePythonClassDefinition(node, filePath, symbols);
      return;
    case 'function_definition':
      return handlePythonFunctionDefinition(node, filePath, symbols, walk);
    case 'call':
      handlePythonCall(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    default:
      return;
  }
}

function analyzePythonFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitPythonNode(
      node,
      state,
      walk,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function getRustCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const identifier = getIdentifierText(calleeNode) ?? (
    calleeNode?.type === 'scoped_identifier'
      ? getLastPathSegment(calleeNode.text, '::')
      : null
  );

  return identifier ? importedBindings.get(identifier) ?? null : null;
}

function handleRustUseDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  const specifier = getNodeText(node.childForFieldName('argument'));
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveRustUsePath(filePath, workspaceRoot, specifier);
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getLastPathSegment(specifier, '::'), {
    importedName: getLastPathSegment(specifier, '::'),
    resolvedPath,
    specifier,
  });
}

function handleRustModuleItem(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const moduleName = getIdentifierText(node.childForFieldName('name'));
  if (!moduleName) {
    return;
  }

  addImportRelation(
    relations,
    filePath,
    moduleName,
    resolveRustModuleDeclarationPath(filePath, moduleName),
  );
}

function handleRustNamedSymbol(
  node: Parser.SyntaxNode,
  kind: 'struct' | 'enum' | 'trait',
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

function handleRustFunctionItem(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.parent?.type === 'declaration_list' && node.parent.parent?.type === 'impl_item'
    ? 'method'
    : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function handleRustCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getRustCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}

function visitRustNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'use_declaration':
      return handleRustUseDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
    case 'mod_item':
      handleRustModuleItem(node, filePath, relations);
      return;
    case 'struct_item':
      handleRustNamedSymbol(node, 'struct', filePath, symbols);
      return;
    case 'enum_item':
      handleRustNamedSymbol(node, 'enum', filePath, symbols);
      return;
    case 'trait_item':
      handleRustNamedSymbol(node, 'trait', filePath, symbols);
      return;
    case 'function_item':
      return handleRustFunctionItem(node, filePath, symbols, walk);
    case 'call_expression':
      handleRustCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    default:
      return;
  }
}

function analyzeRustFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitRustNode(
      node,
      state,
      walk,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function getGoImportLocalName(importSpec: Parser.SyntaxNode, specifier: string): string {
  const aliasName = getIdentifierText(importSpec.childForFieldName('name'));
  if (aliasName) {
    return aliasName;
  }

  return getLastPathSegment(specifier, '/');
}

function getGoCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const directIdentifier = getIdentifierText(calleeNode);
  if (directIdentifier) {
    return importedBindings.get(directIdentifier) ?? null;
  }

  if (calleeNode?.type !== 'selector_expression') {
    return null;
  }

  const objectNode = calleeNode.childForFieldName('operand') ?? calleeNode.namedChildren[0];
  const objectIdentifier = getIdentifierText(objectNode);
  return objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
}

function handleGoImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const importSpecs = node.descendantsOfType('import_spec');
  for (const importSpec of importSpecs) {
    const specifier = getStringSpecifier(importSpec.childForFieldName('path'));
    if (!specifier) {
      continue;
    }

    const resolvedPath = specifier.startsWith('.')
      ? resolveTreeSitterImportPath(filePath, specifier)
      : resolveGoPackagePath(filePath, workspaceRoot, specifier);
    addImportRelation(relations, filePath, specifier, resolvedPath);
    importedBindings.set(getGoImportLocalName(importSpec, specifier), {
      importedName: specifier,
      resolvedPath,
      specifier,
    });
  }

  return { skipChildren: true };
}

function handleGoCallableDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const kind = node.type === 'method_declaration' ? 'method' : 'function';
  const symbol = createSymbol(filePath, kind, name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function getGoTypeKind(node: Parser.SyntaxNode): 'interface' | 'struct' | 'type' {
  const typeNode = node.childForFieldName('type') ?? node.namedChildren.at(-1);
  if (typeNode?.type === 'interface_type') {
    return 'interface';
  }

  if (typeNode?.type === 'struct_type') {
    return 'struct';
  }

  return 'type';
}

function handleGoTypeSpec(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  symbols.push(createSymbol(filePath, getGoTypeKind(node), name, node));
}

function handleGoCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getGoCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}

function visitGoNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration':
      return handleGoImportDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
    case 'function_declaration':
    case 'method_declaration':
      return handleGoCallableDeclaration(node, filePath, symbols, walk);
    case 'type_spec':
      handleGoTypeSpec(node, filePath, symbols);
      return;
    case 'call_expression':
      handleGoCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    default:
      return;
  }
}

function analyzeGoFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitGoNode(
      node,
      state,
      walk,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

interface CSharpWalkState {
  currentNamespace: string | null;
  currentSymbolId?: string;
}

function addCSharpImportTarget(
  importTargetsByNamespace: Map<string, Set<string>>,
  namespaceName: string,
  targetPath: string,
): void {
  const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
  paths.add(targetPath);
  importTargetsByNamespace.set(namespaceName, paths);
}

function normalizeCSharpTypeName(typeName: string): string {
  return typeName
    .replace(/\?.*$/u, '')
    .replace(/<.*$/u, '')
    .split('.')
    .filter(Boolean)
    .at(-1)
    ?? typeName;
}

function isLikelyCSharpTypeName(typeName: string | null): typeName is string {
  return typeof typeName === 'string' && /^[A-Z]/u.test(typeName);
}

function getCSharpTypeName(node: Parser.SyntaxNode | null | undefined): string | null {
  const text = getNodeText(node) ?? getIdentifierText(node) ?? node?.text ?? null;
  return text ? normalizeCSharpTypeName(text) : null;
}

function getCSharpNamespaceName(node: Parser.SyntaxNode): string | null {
  return getNodeText(
    node.childForFieldName('name')
    ?? node.namedChildren.find((child) =>
      child.type === 'identifier'
      || child.type === 'qualified_name'
      || child.type === 'alias_qualified_name',
    ),
  );
}

function getCSharpFileScopedNamespaceName(rootNode: Parser.SyntaxNode): string | null {
  const declaration = rootNode.namedChildren.find(
    (child) => child.type === 'file_scoped_namespace_declaration',
  );
  return declaration ? getCSharpNamespaceName(declaration) : null;
}

function resolveCSharpTypeReference(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  typeName: string,
  currentNamespace: string | null,
): string | null {
  return resolveCSharpTypePath(
    workspaceRoot,
    filePath,
    normalizeCSharpTypeName(typeName),
    currentNamespace,
    [...usingNamespaces],
  );
}

function resolveCSharpUsingImport(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  typeName: string,
  currentNamespace: string | null,
): string | null {
  const normalizedTypeName = normalizeCSharpTypeName(typeName);
  for (const namespaceName of usingNamespaces) {
    const resolvedPath = resolveCSharpTypePathInNamespace(
      workspaceRoot,
      filePath,
      namespaceName,
      normalizedTypeName,
    );
    if (!resolvedPath) {
      continue;
    }

    addCSharpImportTarget(importTargetsByNamespace, namespaceName, resolvedPath);
    return resolvedPath;
  }

  return resolveCSharpTypeReference(
    workspaceRoot,
    filePath,
    usingNamespaces,
    normalizedTypeName,
    currentNamespace,
  );
}

function getCSharpTypeDeclarationKind(
  node: Parser.SyntaxNode,
): 'interface' | 'struct' | 'enum' | 'class' {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'struct_declaration') {
    return 'struct';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

function handleCSharpNamespaceNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> {
  if (node.type === 'file_scoped_namespace_declaration') {
    return { skipChildren: true };
  }

  const namespaceName = getCSharpNamespaceName(node) ?? state.currentNamespace;
  for (const child of node.namedChildren) {
    walk(child, {
      ...state,
      currentNamespace: namespaceName,
    });
  }

  return { skipChildren: true };
}

function handleCSharpUsingDirective(
  node: Parser.SyntaxNode,
  usingNamespaces: Set<string>,
): void {
  const specifier = getNodeText(node.namedChildren[0]);
  if (specifier) {
    usingNamespaces.add(specifier);
  }
}

function handleCSharpTypeDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, getCSharpTypeDeclarationKind(node), name, node));
  }

  if (node.type === 'enum_declaration') {
    return;
  }

  for (const baseType of node.descendantsOfType(['identifier', 'qualified_name'])) {
    if (baseType.parent?.type !== 'base_list') {
      continue;
    }

    addInheritRelation(
      relations,
      filePath,
      baseType.text,
      resolveCSharpUsingImport(
        workspaceRoot,
        filePath,
        usingNamespaces,
        importTargetsByNamespace,
        baseType.text,
        state.currentNamespace,
      ),
    );
  }
}

function handleCSharpMethodDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, {
      ...state,
      currentSymbolId: symbol.id,
    });
  }

  return { skipChildren: true };
}

function addCSharpReferenceRelation(
  filePath: string,
  state: CSharpWalkState,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  typeName: string,
): void {
  const resolvedPath = resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    state.currentNamespace,
  );
  if (resolvedPath) {
    addReferenceRelation(
      relations,
      filePath,
      typeName,
      resolvedPath,
      state.currentSymbolId,
    );
  }
}

function handleCSharpMemberAccessExpression(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  const objectNode = node.childForFieldName('expression') ?? node.namedChildren[0];
  const objectIdentifier = getIdentifierText(objectNode);
  if (isLikelyCSharpTypeName(objectIdentifier)) {
    addCSharpReferenceRelation(
      filePath,
      state,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
      objectIdentifier,
    );
  }
}

function handleCSharpObjectCreationExpression(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  const typeName = getCSharpTypeName(node.childForFieldName('type'));
  if (isLikelyCSharpTypeName(typeName)) {
    addCSharpReferenceRelation(
      filePath,
      state,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
      typeName,
    );
  }
}

function visitCSharpNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: Set<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): TreeWalkAction<CSharpWalkState> | void {
  switch (node.type) {
    case 'namespace_declaration':
    case 'file_scoped_namespace_declaration':
      return handleCSharpNamespaceNode(node, state, walk);
    case 'using_directive':
      handleCSharpUsingDirective(node, usingNamespaces);
      return;
    case 'class_declaration':
    case 'interface_declaration':
    case 'struct_declaration':
    case 'enum_declaration':
      handleCSharpTypeDeclaration(
        node,
        state,
        filePath,
        workspaceRoot,
        relations,
        symbols,
        usingNamespaces,
        importTargetsByNamespace,
      );
      return;
    case 'method_declaration':
      return handleCSharpMethodDeclaration(node, state, filePath, symbols, walk);
    case 'member_access_expression':
      handleCSharpMemberAccessExpression(
        node,
        state,
        filePath,
        workspaceRoot,
        relations,
        usingNamespaces,
        importTargetsByNamespace,
      );
      return;
    case 'object_creation_expression':
      handleCSharpObjectCreationExpression(
        node,
        state,
        filePath,
        workspaceRoot,
        relations,
        usingNamespaces,
        importTargetsByNamespace,
      );
      return;
    default:
      return;
  }
}

function recordCSharpImportTargets(
  workspaceRoot: string,
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  for (const relation of relations) {
    if (
      (relation.kind !== 'reference' && relation.kind !== 'inherit')
      || !relation.resolvedPath
      || !relation.specifier
    ) {
      continue;
    }

    for (const namespaceName of usingNamespaces) {
      const expectedPath = resolveCSharpTypePathInNamespace(
        workspaceRoot,
        filePath,
        namespaceName,
        normalizeCSharpTypeName(relation.specifier),
      );
      if (expectedPath === relation.resolvedPath) {
        addCSharpImportTarget(importTargetsByNamespace, namespaceName, relation.resolvedPath);
      }
    }
  }
}

function appendCSharpUsingImportRelations(
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: ReadonlyMap<string, Set<string>>,
): void {
  for (const namespaceName of usingNamespaces) {
    const targetPaths = importTargetsByNamespace.get(namespaceName);
    if (!targetPaths || targetPaths.size === 0) {
      addImportRelation(relations, filePath, namespaceName, null);
      continue;
    }

    for (const targetPath of targetPaths) {
      addImportRelation(relations, filePath, namespaceName, targetPath);
    }
  }
}

function analyzeCSharpFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const usingNamespaces = new Set<string>();
  const importTargetsByNamespace = new Map<string, Set<string>>();
  walkTree(
    tree.rootNode,
    { currentNamespace: getCSharpFileScopedNamespaceName(tree.rootNode) },
    (node, state, walk) =>
      visitCSharpNode(
        node,
        state,
        walk,
        filePath,
        workspaceRoot,
        relations,
        symbols,
        usingNamespaces,
        importTargetsByNamespace,
      ),
  );

  recordCSharpImportTargets(
    workspaceRoot,
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );
  appendCSharpUsingImportRelations(
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );

  return normalizeAnalysisResult(filePath, symbols, relations);
}

function getJavaImportLocalName(specifier: string): string {
  return getLastPathSegment(specifier, '.');
}

function getJavaCallBinding(
  node: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const objectNode = node.childForFieldName('object');
  const objectIdentifier = getIdentifierText(objectNode);
  return objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
}

function getJavaPackageName(tree: Parser.Tree): string | null {
  const declarationNode = tree.rootNode.namedChildren.find((child) => child.type === 'package_declaration');
  if (!declarationNode) {
    return null;
  }

  const packageNameNode = declarationNode.namedChildren.find((child) =>
    child.type === 'scoped_identifier' || child.type === 'identifier',
  );

  return getNodeText(packageNameNode) ?? null;
}

function resolveJavaReferencePath(
  sourceRoot: string | null,
  packageName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('.')) {
    return resolveJavaTypePath(sourceRoot, typeName);
  }

  return packageName
    ? resolveJavaTypePath(sourceRoot, `${packageName}.${typeName}`)
    : null;
}

function handleJavaImportDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): void {
  const specifier = getNodeText(node.namedChildren[0]);
  if (!specifier) {
    return;
  }

  const resolvedPath = sourceRoot ? resolveJavaTypePath(sourceRoot, specifier) : null;
  addImportRelation(relations, filePath, specifier, resolvedPath);
  importedBindings.set(getJavaImportLocalName(specifier), {
    importedName: specifier,
    resolvedPath,
    specifier,
  });
}

function getJavaTypeDeclarationKind(node: Parser.SyntaxNode): 'interface' | 'enum' | 'class' {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

function handleJavaTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, getJavaTypeDeclarationKind(node), name, node));
  }

  if (node.type === 'enum_declaration') {
    return;
  }

  const superclassNode = node.childForFieldName('superclass');
  const superclass = superclassNode?.namedChildren.find((child) => child.type === 'type_identifier');
  if (superclass) {
    addInheritRelation(
      relations,
      filePath,
      superclass.text,
      resolveJavaReferencePath(sourceRoot, packageName, importedBindings, superclass.text),
    );
  }
}

function handleJavaMethodDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function handleJavaMethodInvocation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  currentSymbolId?: string,
): void {
  const binding = getJavaCallBinding(node, importedBindings);
  if (binding) {
    addCallRelation(relations, filePath, binding, currentSymbolId);
  }
}

function visitJavaNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration':
      handleJavaImportDeclaration(node, filePath, sourceRoot, relations, importedBindings);
      return;
    case 'class_declaration':
    case 'interface_declaration':
    case 'enum_declaration':
      handleJavaTypeDeclaration(
        node,
        filePath,
        sourceRoot,
        packageName,
        relations,
        symbols,
        importedBindings,
      );
      return;
    case 'method_declaration':
      return handleJavaMethodDeclaration(node, filePath, symbols, walk);
    case 'method_invocation':
      handleJavaMethodInvocation(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    default:
      return;
  }
}

function analyzeJavaFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const packageName = getJavaPackageName(tree);
  const sourceRoot = resolveJavaSourceRoot(filePath, packageName);
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaNode(
      node,
      state,
      walk,
      filePath,
      sourceRoot,
      packageName,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

export async function analyzeFileWithTreeSitter(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult | null> {
  const runtime = await createTreeSitterRuntime(filePath);
  if (!runtime) {
    return null;
  }

  const tree = runtime.parser.parse(content);

  switch (runtime.languageKind) {
    case 'csharp':
      return analyzeCSharpFile(filePath, tree, workspaceRoot);
    case 'go':
      return analyzeGoFile(filePath, tree, workspaceRoot);
    case 'java':
      return analyzeJavaFile(filePath, tree);
    case 'javascript':
    case 'tsx':
    case 'typescript':
      return analyzeJavaScriptFamilyFile(filePath, tree);
    case 'python':
      return analyzePythonFile(filePath, tree, workspaceRoot);
    case 'rust':
      return analyzeRustFile(filePath, tree, workspaceRoot);
    default:
      return null;
  }
}

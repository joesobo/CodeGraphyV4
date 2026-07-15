import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import manifest from '../../codegraphy.json';
import { GDScriptPathResolver } from '../PathResolver';
import {
  absolutePath,
  readSignalConnectUsages,
  readSignalDeclarations,
  readTypedIdentifiers,
  type SignalConnectUsage,
  type SignalDeclaration,
} from './signalConnectionModel';

function toPascalIdentifier(identifier: string): string {
  return identifier.replace(/^_+/, '').split(/[^A-Za-z0-9]+|_/).filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function resolveReceiverFile(
  usage: SignalConnectUsage,
  typedIdentifiers: ReadonlyMap<string, string>,
  resolver: GDScriptPathResolver,
): string | null {
  if (!usage.receiver) return usage.relativeFilePath;
  const typeName = typedIdentifiers.get(usage.receiver);
  const typedFile = typeName ? resolver.resolve(typeName, usage.relativeFilePath) : null;
  if (typedFile) return typedFile;
  const inferredTypeName = toPascalIdentifier(usage.receiver);
  return inferredTypeName ? resolver.resolve(inferredTypeName, usage.relativeFilePath) : null;
}

function createRelation(
  usage: SignalConnectUsage,
  declaration: SignalDeclaration,
  workspaceRoot: string,
): IAnalysisRelation {
  const toFilePath = absolutePath(workspaceRoot, usage.relativeFilePath);
  return {
    kind: 'codegraphy.gdscript:signal-connection',
    pluginId: manifest.id,
    sourceId: 'gdscript-signal-connection',
    fromFilePath: absolutePath(workspaceRoot, declaration.relativeFilePath),
    toFilePath,
    resolvedPath: toFilePath,
    specifier: usage.receiver ? `${usage.receiver}.${usage.signalName}.connect` : `${usage.signalName}.connect`,
    fromSymbolId: declaration.symbolId,
    metadata: { signalName: usage.signalName },
  };
}

export function buildSignalConnectionRelations(
  fileContents: ReadonlyMap<string, string>,
  workspaceRoot: string,
  resolver: GDScriptPathResolver,
): Map<string, IAnalysisRelation[]> {
  const { declarations, typedIdentifiers } = indexSignalConnectionFiles(fileContents, workspaceRoot);
  return collectSignalConnectionRelations(fileContents, workspaceRoot, resolver, declarations, typedIdentifiers);
}

function indexSignalConnectionFiles(
  fileContents: ReadonlyMap<string, string>,
  workspaceRoot: string,
): {
  declarations: Map<string, SignalDeclaration>;
  typedIdentifiers: Map<string, Map<string, string>>;
} {
  const declarations = new Map<string, SignalDeclaration>();
  const typedIdentifiers = new Map<string, Map<string, string>>();
  for (const [relativePath, content] of fileContents) {
    for (const declaration of readSignalDeclarations(content, absolutePath(workspaceRoot, relativePath), relativePath)) {
      declarations.set(`${relativePath}:${declaration.name}`, declaration);
    }
    typedIdentifiers.set(relativePath, readTypedIdentifiers(content));
  }

  return { declarations, typedIdentifiers };
}

function collectSignalConnectionRelations(
  fileContents: ReadonlyMap<string, string>,
  workspaceRoot: string,
  resolver: GDScriptPathResolver,
  declarations: ReadonlyMap<string, SignalDeclaration>,
  typedIdentifiers: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Map<string, IAnalysisRelation[]> {
  const relationsBySource = new Map<string, IAnalysisRelation[]>();
  for (const [relativePath, content] of fileContents) {
    for (const usage of readSignalConnectUsages(content, relativePath)) {
      const sourcePath = resolveReceiverFile(usage, typedIdentifiers.get(relativePath) ?? new Map(), resolver) ?? relativePath;
      const declaration = declarations.get(`${sourcePath}:${usage.signalName}`);
      if (!declaration) continue;
      const relations = relationsBySource.get(declaration.relativeFilePath) ?? [];
      relations.push(createRelation(usage, declaration, workspaceRoot));
      relationsBySource.set(declaration.relativeFilePath, relations);
    }
  }
  return relationsBySource;
}

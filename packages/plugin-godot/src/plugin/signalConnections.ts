import * as path from 'path';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { GDScriptPathResolver } from '../PathResolver';
import { parseGDScriptDocument } from '../parser';
import manifest from '../../codegraphy.json';
import { extractSignalSymbols } from './symbol/gdscriptSignals';
import type { GodotWorkspaceFile } from './types';

const SIGNAL_CONNECTION_KIND = 'codegraphy.gdscript:signal-connection';
const SIGNAL_CONNECTION_SOURCE_ID = 'gdscript-signal-connection';
const CONNECT_PATTERN = /(?:(?<receiver>[A-Za-z_][A-Za-z0-9_]*)\.)?(?<signal>[A-Za-z_][A-Za-z0-9_]*)\.connect\s*\(/g;
const TYPED_IDENTIFIER_PATTERN = /\b(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?<type>[A-Za-z_][A-Za-z0-9_]*)/g;

interface SignalDeclaration {
  name: string;
  relativeFilePath: string;
  symbolId: string;
}

interface SignalConnectUsage {
  receiver?: string;
  relativeFilePath: string;
  signalName: string;
}

function absolutePath(workspaceRoot: string, relativeFilePath: string): string {
  return path.join(workspaceRoot, relativeFilePath);
}

function toPascalIdentifier(identifier: string): string {
  return identifier
    .replace(/^_+/, '')
    .split(/[^A-Za-z0-9]+|_/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function readSignalDeclarations(content: string, filePath: string, relativeFilePath: string): SignalDeclaration[] {
  return extractSignalSymbols(content, filePath, relativeFilePath).map(symbol => ({
    name: symbol.name,
    relativeFilePath,
    symbolId: symbol.id,
  }));
}

function readTypedIdentifiers(content: string): Map<string, string> {
  const typedIdentifiers = new Map<string, string>();

  for (const statement of parseGDScriptDocument(content).statements) {
    TYPED_IDENTIFIER_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TYPED_IDENTIFIER_PATTERN.exec(statement.trimmed)) !== null) {
      const name = match.groups?.name;
      const type = match.groups?.type;
      if (name && type) {
        typedIdentifiers.set(name, type);
      }
    }
  }

  return typedIdentifiers;
}

function readSignalConnectUsages(content: string, relativeFilePath: string): SignalConnectUsage[] {
  const usages: SignalConnectUsage[] = [];

  for (const statement of parseGDScriptDocument(content).statements) {
    CONNECT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CONNECT_PATTERN.exec(statement.trimmed)) !== null) {
      const signalName = match.groups?.signal;
      if (!signalName) {
        continue;
      }

      usages.push({
        relativeFilePath,
        signalName,
        ...(match.groups?.receiver ? { receiver: match.groups.receiver } : {}),
      });
    }
  }

  return usages;
}

function resolveReceiverFile(
  usage: SignalConnectUsage,
  typedIdentifiers: ReadonlyMap<string, string>,
  resolver: GDScriptPathResolver,
): string | null {
  if (!usage.receiver) {
    return usage.relativeFilePath;
  }

  const typeName = typedIdentifiers.get(usage.receiver);
  if (typeName) {
    const resolvedTypedFile = resolver.resolve(typeName, usage.relativeFilePath);
    if (resolvedTypedFile) {
      return resolvedTypedFile;
    }
  }

  const inferredTypeName = toPascalIdentifier(usage.receiver);
  return inferredTypeName ? resolver.resolve(inferredTypeName, usage.relativeFilePath) : null;
}

function createSignalConnectionRelation(
  usage: SignalConnectUsage,
  source: { declaration?: SignalDeclaration; relativeFilePath: string },
  workspaceRoot: string,
): IAnalysisRelation {
  const fromFilePath = absolutePath(workspaceRoot, source.relativeFilePath);
  const toFilePath = absolutePath(workspaceRoot, usage.relativeFilePath);

  return {
    kind: SIGNAL_CONNECTION_KIND,
    pluginId: manifest.id,
    sourceId: SIGNAL_CONNECTION_SOURCE_ID,
    fromFilePath,
    toFilePath,
    resolvedPath: toFilePath,
    specifier: usage.receiver
      ? `${usage.receiver}.${usage.signalName}.connect`
      : `${usage.signalName}.connect`,
    ...(source.declaration ? { fromSymbolId: source.declaration.symbolId } : {}),
    metadata: {
      signalName: usage.signalName,
    },
  };
}

export class GodotSignalConnectionIndex {
  private fileContents = new Map<string, string>();
  private relationsBySourceFile = new Map<string, IAnalysisRelation[]>();

  replaceWorkspaceFiles(
    files: readonly GodotWorkspaceFile[],
    workspaceRoot: string,
    resolver: GDScriptPathResolver,
  ): void {
    this.fileContents = new Map(
      files
        .filter(file => file.relativePath.endsWith('.gd'))
        .map(file => [file.relativePath, file.content]),
    );
    this.rebuild(workspaceRoot, resolver);
  }

  replaceFiles(
    files: readonly GodotWorkspaceFile[],
    workspaceRoot: string,
    resolver: GDScriptPathResolver,
  ): void {
    for (const file of files) {
      if (file.relativePath.endsWith('.gd')) {
        this.fileContents.set(file.relativePath, file.content);
      }
    }

    this.rebuild(workspaceRoot, resolver);
  }

  getRelations(relativeFilePath: string): IAnalysisRelation[] {
    return this.relationsBySourceFile.get(relativeFilePath) ?? [];
  }

  clear(): void {
    this.fileContents.clear();
    this.relationsBySourceFile.clear();
  }

  private rebuild(workspaceRoot: string, resolver: GDScriptPathResolver): void {
    const declarationsByFileAndName = new Map<string, SignalDeclaration>();
    const typedIdentifiersByFile = new Map<string, Map<string, string>>();

    for (const [relativeFilePath, content] of this.fileContents) {
      const filePath = absolutePath(workspaceRoot, relativeFilePath);
      for (const declaration of readSignalDeclarations(content, filePath, relativeFilePath)) {
        declarationsByFileAndName.set(`${declaration.relativeFilePath}:${declaration.name}`, declaration);
      }
      typedIdentifiersByFile.set(relativeFilePath, readTypedIdentifiers(content));
    }

    const nextRelationsBySourceFile = new Map<string, IAnalysisRelation[]>();
    for (const [relativeFilePath, content] of this.fileContents) {
      const typedIdentifiers = typedIdentifiersByFile.get(relativeFilePath) ?? new Map<string, string>();
      for (const usage of readSignalConnectUsages(content, relativeFilePath)) {
        const sourceRelativeFilePath = resolveReceiverFile(usage, typedIdentifiers, resolver) ?? relativeFilePath;
        const declaration = declarationsByFileAndName.get(`${sourceRelativeFilePath}:${usage.signalName}`);
        const source = {
          relativeFilePath: declaration?.relativeFilePath ?? sourceRelativeFilePath,
          ...(declaration ? { declaration } : {}),
        };
        const relations = nextRelationsBySourceFile.get(source.relativeFilePath) ?? [];
        relations.push(createSignalConnectionRelation(usage, source, workspaceRoot));
        nextRelationsBySourceFile.set(source.relativeFilePath, relations);
      }
    }

    this.relationsBySourceFile = nextRelationsBySourceFile;
  }
}

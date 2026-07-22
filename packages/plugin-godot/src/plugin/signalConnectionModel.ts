import * as path from 'path';
import { parseGDScriptDocument } from '../parser';
import { extractSignalSymbols } from './symbol/gdscriptSignals';

const CONNECT_PATTERN = /(?:(?<receiver>[A-Za-z_][A-Za-z0-9_]*)\.)?(?<signal>[A-Za-z_][A-Za-z0-9_]*)\.connect\s*\(/g;
const TYPED_IDENTIFIER_PATTERN = /\b(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?<type>[A-Za-z_][A-Za-z0-9_]*)/g;

export interface SignalDeclaration { name: string; relativeFilePath: string; symbolId: string }
export interface SignalConnectUsage { receiver?: string; relativeFilePath: string; signalName: string }

export function absolutePath(workspaceRoot: string, relativeFilePath: string): string {
  return path.join(workspaceRoot, relativeFilePath);
}

export function readSignalDeclarations(
  content: string,
  filePath: string,
  relativeFilePath: string,
): SignalDeclaration[] {
  return extractSignalSymbols(content, filePath, relativeFilePath).map(symbol => ({
    name: symbol.name,
    relativeFilePath,
    symbolId: symbol.id,
  }));
}

function readMatches(pattern: RegExp, content: string): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) matches.push(match);
  return matches;
}

export function readTypedIdentifiers(content: string): Map<string, string> {
  const identifiers = new Map<string, string>();
  for (const statement of parseGDScriptDocument(content).statements) {
    for (const match of readMatches(TYPED_IDENTIFIER_PATTERN, statement.trimmed)) {
      if (match.groups?.name && match.groups.type) identifiers.set(match.groups.name, match.groups.type);
    }
  }
  return identifiers;
}

export function readSignalConnectUsages(content: string, relativeFilePath: string): SignalConnectUsage[] {
  const usages: SignalConnectUsage[] = [];
  for (const statement of parseGDScriptDocument(content).statements) {
    for (const match of readMatches(CONNECT_PATTERN, statement.trimmed)) {
      if (!match.groups?.signal) continue;
      usages.push({
        relativeFilePath,
        signalName: match.groups.signal,
        ...(match.groups.receiver ? { receiver: match.groups.receiver } : {}),
      });
    }
  }
  return usages;
}

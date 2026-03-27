import * as ts from 'typescript';
import { type ScrapValidationIssue } from './scrapTypes';

function diagnosticLine(sourceFile: ts.SourceFile, diagnostic: ts.DiagnosticWithLocation): number {
  return sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1;
}

function diagnosticSegments(messageText: string | ts.DiagnosticMessageChain): string[] {
  if (typeof messageText === 'string') {
    return [messageText];
  }

  return [
    messageText.messageText,
    ...(messageText.next ?? []).flatMap((segment) => diagnosticSegments(segment))
  ];
}

function diagnosticMessage(diagnostic: ts.DiagnosticWithLocation): string {
  return diagnosticSegments(diagnostic.messageText)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join(' ');
}

function parseDiagnostics(sourceFile: ts.SourceFile): readonly ts.DiagnosticWithLocation[] {
  return ((sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
  }).parseDiagnostics ?? []);
}

export function parseIssues(sourceFile: ts.SourceFile): ScrapValidationIssue[] {
  return parseDiagnostics(sourceFile).map((diagnostic) => ({
    kind: 'parse',
    line: diagnosticLine(sourceFile, diagnostic),
    message: diagnosticMessage(diagnostic)
  }));
}

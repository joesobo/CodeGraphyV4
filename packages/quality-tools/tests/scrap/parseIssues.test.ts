import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parseIssues } from '../../src/scrap/parseIssues';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('parseIssues', () => {
  it('returns an empty list for valid files', () => {
    expect(parseIssues(parse(`test('ok', () => { expect(true).toBe(true); });`))).toEqual([]);
  });

  it('falls back to an empty diagnostic list when parse diagnostics are missing', () => {
    const sourceFile = parse(`test('ok', () => { expect(true).toBe(true); });`) as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
    };

    sourceFile.parseDiagnostics = undefined;
    expect(parseIssues(sourceFile)).toEqual([]);
  });

  it('reports the diagnostic line and message for malformed files', () => {
    expect(parseIssues(parse(`
      test('broken', () => {
        expect(true).toBe(true);
    `))).toEqual([
      {
        kind: 'parse',
        line: 4,
        message: "'}' expected."
      }
    ]);
  });

  it('flattens nested diagnostic messages with spaces between segments', () => {
    const sourceFile = parse(`test('broken', () => {})`) as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
    };

    sourceFile.parseDiagnostics = [{
      category: ts.DiagnosticCategory.Error,
      code: 1000,
      file: sourceFile,
      length: 1,
      messageText: {
        category: ts.DiagnosticCategory.Error,
        code: 1001,
        messageText: ' first line ',
        next: [{
          category: ts.DiagnosticCategory.Error,
          code: 1002,
          messageText: '   '
        }, {
          category: ts.DiagnosticCategory.Error,
          code: 1003,
          messageText: 'second line '
        }]
      },
      start: 0
    }];

    expect(parseIssues(sourceFile)).toEqual([
      {
        kind: 'parse',
        line: 1,
        message: 'first line second line'
      }
    ]);
  });
});

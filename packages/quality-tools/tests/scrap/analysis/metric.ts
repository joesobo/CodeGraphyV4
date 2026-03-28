import * as ts from 'typescript';
import { analyzeScrapFile } from '../../../src/scrap/analysis/metrics';

function parseTestFile(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'example.test.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

export function analyzeScrapMetric(source: string) {
  return analyzeScrapFile(parseTestFile(source));
}

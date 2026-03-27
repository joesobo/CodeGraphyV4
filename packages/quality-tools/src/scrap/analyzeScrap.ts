import { readFileSync } from 'fs';
import * as ts from 'typescript';
import { type QualityTarget } from '../shared/resolveTarget';
import { discoverTestFiles } from './testFiles';
import { analyzeScrapFile, type ScrapFileMetric } from './metrics';

export function analyzeScrap(target: QualityTarget): ScrapFileMetric[] {
  return discoverTestFiles(target).map((filePath: string) => {
    const source = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    return analyzeScrapFile(sourceFile);
  });
}

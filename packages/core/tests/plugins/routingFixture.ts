import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';

export type Relation = NonNullable<IFileAnalysisResult['relations']>[number];

export function plugin(
  id: string,
  extensions: string[],
  analyzeFile?: IPlugin['analyzeFile'],
): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '4',
    supportedExtensions: extensions,
    analyzeFile,
  };
}

export function relation(overrides: Partial<Relation>): Relation {
  return {
    kind: 'import',
    sourceId: 'source',
    fromFilePath: 'src/source.ts',
    ...overrides,
  };
}

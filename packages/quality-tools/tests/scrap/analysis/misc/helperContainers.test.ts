import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  ancestorHelperContainers,
  findHelperContainer
} from '../../../../src/scrap/structure/containers';
import { findExamples } from '../../../../src/scrap/analysis/find';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function findArrowFunction(sourceFile: ts.SourceFile): ts.ArrowFunction | undefined {
  let match: ts.ArrowFunction | undefined;

  function visit(node: ts.Node): void {
    if (!match && ts.isArrowFunction(node)) {
      match = node;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return match;
}

describe('helperContainers', () => {
  it('finds the nearest block or source-file container', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        const buildValue = () => {
          return 'value';
        };
      });
    `);

    const arrow = findArrowFunction(sourceFile);

    expect(findHelperContainer(arrow)).toBe(arrow!.parent.parent.parent);
    expect(findHelperContainer(undefined)).toBeUndefined();
  });

  it('walks only block and source-file containers for example visibility', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function buildValue() {
          return 'value';
        }

        it('uses helpers', () => {
          expect(buildValue()).toBe('value');
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(ancestorHelperContainers(example!.body).map((node) => node.kind)).toEqual([
      ts.SyntaxKind.Block,
      ts.SyntaxKind.SourceFile
    ]);
  });
});

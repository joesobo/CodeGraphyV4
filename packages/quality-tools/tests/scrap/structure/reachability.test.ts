import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectHelperDefinitions } from '../../../src/scrap/structure/definitions';
import {
  directHelperCalls,
  reachableHelpers
} from '../../../src/scrap/structure/reachability';
import { findExamples } from '../../../src/scrap/analysis/find';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('helperReachability', () => {
  it('returns no direct calls for functions without a body', () => {
    const sourceFile = parse(`
      declare function buildValue(): string;
    `);

    const declaration = sourceFile.statements.find(ts.isFunctionDeclaration);

    expect(directHelperCalls(declaration!, [])).toEqual([]);
    expect(reachableHelpers(declaration!, [])).toEqual([]);
  });

  it('returns only direct helper calls before expanding transitive reachability', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function trimValue(value: string) {
          return value.trim();
        }

        const buildValue = () => {
          return trimValue(' value ');
        };

        it('uses helpers', () => {
          expect(buildValue()).toBe('value');
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const helpers = collectHelperDefinitions(sourceFile);

    expect(directHelperCalls(example!.body, helpers).map((helper) => helper.name)).toEqual(['buildValue']);
    expect(reachableHelpers(example!.body, helpers).map((helper) => helper.name)).toEqual([
      'buildValue',
      'trimValue'
    ]);
  });

  it('prefers the nearest helper when the same name exists in multiple containers', () => {
    const sourceFile = parse(`
      function buildValue() {
        return 'outer';
      }

      describe('suite', () => {
        function buildValue() {
          return 'inner';
        }

        it('uses helpers', () => {
          expect(buildValue()).toBe('inner');
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const helpers = collectHelperDefinitions(sourceFile);

    const direct = directHelperCalls(example!.body, helpers);
    expect(direct).toHaveLength(1);
    expect(direct[0].body.getSourceFile().getLineAndCharacterOfPosition(direct[0].body.getStart()).line + 1).toBe(7);
  });

  it('deduplicates repeated helper calls while still following transitive helpers once', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function first() {
          return second() + second();
        }

        function second() {
          return 'value';
        }

        it('uses helpers', () => {
          expect(first()).toBeDefined();
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const helpers = collectHelperDefinitions(sourceFile);

    expect(reachableHelpers(example!.body, helpers).map((helper) => helper.name)).toEqual([
      'first',
      'second'
    ]);
  });

  it('stops revisiting helpers when calls are recursive', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function first() {
          return second();
        }

        function second() {
          return first();
        }

        it('uses helpers', () => {
          expect(first()).toBeDefined();
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const helpers = collectHelperDefinitions(sourceFile);

    expect(reachableHelpers(example!.body, helpers).map((helper) => helper.name)).toEqual([
      'first',
      'second'
    ]);
  });
});

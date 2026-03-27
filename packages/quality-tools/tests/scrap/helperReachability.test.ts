import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectHelperDefinitions } from '../../src/scrap/helperDefinitions';
import {
  directHelperCalls,
  reachableHelpers
} from '../../src/scrap/helperReachability';
import { findExamples } from '../../src/scrap/findExamples';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('helperReachability', () => {
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

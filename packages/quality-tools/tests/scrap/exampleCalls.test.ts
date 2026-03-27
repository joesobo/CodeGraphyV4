import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  collectCallCount,
  countBranches,
  isAssertionCall,
  isExpectCall,
  isMockCall,
  isTypeOnlyAssertionCall
} from '../../src/scrap/exampleCalls';

function parseBlock(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('exampleCalls', () => {
  it('counts branching nodes in the tree', () => {
    const sourceFile = parseBlock(`
      if (ready) {}
      switch (mode) { case 'a': break; }
      for (const value of values) {}
    `);

    expect(countBranches(sourceFile)).toBe(3);
  });

  it('counts expect and mock calls separately', () => {
    const sourceFile = parseBlock(`
      expect(value).toBe(true);
      vi.mock('./thing');
      jest.spyOn(console, 'log');
    `);

    expect(collectCallCount(sourceFile, isExpectCall)).toBe(1);
    expect(collectCallCount(sourceFile, isMockCall)).toBe(2);
  });

  it('counts compile-time assertions once and treats them as assertions', () => {
    const sourceFile = parseBlock(`
      test('types', () => {
        expectTypeOf(value).toEqualTypeOf<string>();
        assertType<string>(value);
        expect(value).toBe(true);
      });
    `);

    expect(collectCallCount(sourceFile, isAssertionCall)).toBe(3);
    expect(collectCallCount(sourceFile, isTypeOnlyAssertionCall)).toBe(2);
  });
});

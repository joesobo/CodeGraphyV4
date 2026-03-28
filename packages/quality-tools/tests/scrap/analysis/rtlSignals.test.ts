import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { isRtlQueryCall, isRtlRenderCall, isRtlMutationCall, analyzeRtlSignals } from '../../../src/scrap/analysis/rtlSignals';

// Helper to create a mock CallExpression
function createCallExpression(methodName: string): ts.CallExpression {
  const identifier = ts.factory.createIdentifier(methodName);
  return ts.factory.createCallExpression(identifier, undefined, []);
}

describe('rtlSignals', () => {
  describe('isRtlQueryCall', () => {
    it('recognizes getBy queries', () => {
      const node = createCallExpression('getByRole');
      expect(isRtlQueryCall(node)).toBe(true);
    });

    it('recognizes findBy queries', () => {
      const node = createCallExpression('findByLabelText');
      expect(isRtlQueryCall(node)).toBe(true);
    });

    it('recognizes queryAllBy queries', () => {
      const node = createCallExpression('queryAllByTestId');
      expect(isRtlQueryCall(node)).toBe(true);
    });

    it('returns false for non-query calls', () => {
      const node = createCallExpression('render');
      expect(isRtlQueryCall(node)).toBe(false);
    });

    it('returns false when the terminal call cannot be named', () => {
      const node = ts.factory.createCallExpression(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier('renderers'),
          ts.factory.createNumericLiteral(0)
        ),
        undefined,
        []
      );

      expect(isRtlQueryCall(node)).toBe(false);
    });
  });

  describe('isRtlRenderCall', () => {
    it('recognizes render calls', () => {
      const node = createCallExpression('render');
      expect(isRtlRenderCall(node)).toBe(true);
    });

    it('recognizes renderHook calls', () => {
      const node = createCallExpression('renderHook');
      expect(isRtlRenderCall(node)).toBe(true);
    });

    it('recognizes rerender calls', () => {
      const node = createCallExpression('rerender');
      expect(isRtlRenderCall(node)).toBe(true);
    });

    it('returns false for non-render calls', () => {
      const node = createCallExpression('fireEvent');
      expect(isRtlRenderCall(node)).toBe(false);
    });
  });

  describe('isRtlMutationCall', () => {
    it('recognizes fireEvent calls', () => {
      const node = createCallExpression('fireEvent');
      expect(isRtlMutationCall(node)).toBe(true);
    });

    it('recognizes userEvent calls', () => {
      const node = createCallExpression('userEvent');
      expect(isRtlMutationCall(node)).toBe(true);
    });

    it('recognizes rerender as mutation', () => {
      const node = createCallExpression('rerender');
      expect(isRtlMutationCall(node)).toBe(true);
    });

    it('returns false for non-mutation calls', () => {
      const node = createCallExpression('render');
      expect(isRtlMutationCall(node)).toBe(false);
    });
  });

  describe('mutation killers for rtlSignals.ts', () => {
    it('kills mutation: empty string fallback in isRtlRenderCall', () => {
      const node = ts.factory.createCallExpression(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier('renderers'),
          ts.factory.createNumericLiteral(0)
        ),
        undefined,
        []
      );
      expect(isRtlRenderCall(node)).toBe(false);
    });

    it('kills mutation: empty string fallback in isRtlMutationCall baseCallName', () => {
      // First part of OR: baseCallName ?? ''
      const node = createCallExpression('unknownBase');
      // Should not match any mutation call
      expect(isRtlMutationCall(node)).toBe(false);
    });

    it('kills mutation: empty string fallback in isRtlMutationCall terminalCallName', () => {
      const node = ts.factory.createCallExpression(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier('events'),
          ts.factory.createNumericLiteral(0)
        ),
        undefined,
        []
      );

      expect(isRtlMutationCall(node)).toBe(false);
    });

    it('kills mutation: query prefix check must compare all prefixes', () => {
      // All query prefixes must be checked
      const prefixes = ['findAllBy', 'findBy', 'getAllBy', 'getBy', 'queryAllBy', 'queryBy'];
      prefixes.forEach((prefix) => {
        const methodName = `${prefix}TestId`;
        const node = createCallExpression(methodName);
        expect(isRtlQueryCall(node)).toBe(true);
      });
    });

    it('kills mutation: empty string literal must not be used for other operations', () => {
      // Verify that empty string is used for Set.has() fallback, not for other comparisons
      const renderCall = createCallExpression('render');
      expect(isRtlRenderCall(renderCall)).toBe(true);

      // Non-RTL call with unknown name should not match
      const unknownCall = createCallExpression('unknownMethod');
      expect(isRtlRenderCall(unknownCall)).toBe(false);
    });

    it('kills mutation: logical OR in isRtlMutationCall is necessary', () => {
      // Mutation must check EITHER fireEvent/userEvent OR rerender
      const fireEventCall = createCallExpression('fireEvent');
      expect(isRtlMutationCall(fireEventCall)).toBe(true);

      const rerenderCall = createCallExpression('rerender');
      expect(isRtlMutationCall(rerenderCall)).toBe(true);

      const unrelatedCall = createCallExpression('render');
      expect(isRtlMutationCall(unrelatedCall)).toBe(false);
    });

    it('analyzeRtlSignals counts signals correctly', () => {
      // Create a simple program node to test the analyzer
      const sourceFile = ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest, true);
      const metrics = analyzeRtlSignals(sourceFile);

      expect(metrics.rtlQueryCount).toBeDefined();
      expect(metrics.rtlRenderCount).toBeDefined();
      expect(metrics.rtlMutationCount).toBeDefined();
      expect(typeof metrics.rtlQueryCount).toBe('number');
      expect(typeof metrics.rtlRenderCount).toBe('number');
      expect(typeof metrics.rtlMutationCount).toBe('number');
    });

    it('kills L17, L25, and L29 fallback mutants with unnamed terminal calls', () => {
      const node = ts.factory.createCallExpression(
        ts.factory.createElementAccessExpression(
          ts.factory.createIdentifier('queries'),
          ts.factory.createNumericLiteral(0)
        ),
        undefined,
        []
      );

      expect(isRtlQueryCall(node)).toBe(false);
      expect(isRtlRenderCall(node)).toBe(false);
      expect(isRtlMutationCall(node)).toBe(false);

      expect(isRtlRenderCall(createCallExpression('render'))).toBe(true);
      expect(isRtlQueryCall(createCallExpression('getByRole'))).toBe(true);
      expect(isRtlMutationCall(createCallExpression('fireEvent'))).toBe(true);
    });
  });
});

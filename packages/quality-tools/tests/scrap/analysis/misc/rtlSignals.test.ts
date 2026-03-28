import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { terminalCallName } from '../../../../src/scrap/calls/names';
import { analyzeRtlSignals, isRtlMutationCall, isRtlQueryCall, isRtlRenderCall } from '../../../../src/scrap/analysis/rtlSignals';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function call(source: string, predicate: (value: ts.CallExpression) => boolean): ts.CallExpression {
  let match: ts.CallExpression | undefined;
  const sourceFile = parse(source);

  function walk(node: ts.Node): void {
    if (match) {
      return;
    }

    if (ts.isCallExpression(node) && predicate(node)) {
      match = node;
      return;
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);

  if (!match) {
    throw new Error('Expected call expression');
  }

  return match;
}

describe('rtlSignals', () => {
  it('detects render and query calls', () => {
    expect(isRtlRenderCall(call(`render(<Panel />);`, (value) => terminalCallName(value.expression) === 'render'))).toBe(true);
    expect(isRtlQueryCall(call(`screen.getByText('Ready');`, (value) => terminalCallName(value.expression) === 'getByText'))).toBe(true);
    expect(isRtlQueryCall(call(`within(panel).queryByRole('button');`, (value) => terminalCallName(value.expression) === 'queryByRole'))).toBe(true);
  });

  it('detects mutation calls from userEvent, fireEvent, and rerender', () => {
    expect(isRtlMutationCall(call(`await userEvent.click(button);`, (value) => terminalCallName(value.expression) === 'click'))).toBe(true);
    expect(isRtlMutationCall(call(`fireEvent.change(input, { target: { value: 'a' } });`, (value) => terminalCallName(value.expression) === 'change'))).toBe(true);
    expect(isRtlMutationCall(call(`rerender(<Panel open />);`, (value) => terminalCallName(value.expression) === 'rerender'))).toBe(true);
    expect(isRtlMutationCall(call(`screen.getByText('Ready');`, (value) => terminalCallName(value.expression) === 'getByText'))).toBe(false);
  });

  it('counts rtl render, query, and mutation signals together', () => {
    const sourceFile = parse(`
      test('ui', async () => {
        render(<Panel />);
        screen.getByText('Ready');
        screen.queryByRole('button');
        await screen.findByText('Later');
        await userEvent.click(button);
        fireEvent.change(input, { target: { value: 'a' } });
      });
    `);

    expect(analyzeRtlSignals(sourceFile)).toEqual({
      rtlMutationCount: 2,
      rtlQueryCount: 3,
      rtlRenderCount: 1
    });
  });
});

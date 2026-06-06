import { describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

describe('pipeline/plugins/treesitter/runtime/analyzeJava/inheritance', () => {
  it('extracts extends and implements relations from Java class declarations', async () => {
    const filePath = '/workspace/src/com/example/app/App.java';
    const source = [
      'package com.example.app;',
      '',
      'public class App extends BaseService implements RunnableThing {',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, '/workspace');

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'BaseService',
        fromSymbolId: `${filePath}:class:App`,
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'RunnableThing',
        fromSymbolId: `${filePath}:class:App`,
      }),
    ]));
  });
});

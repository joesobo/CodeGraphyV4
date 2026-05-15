import { describe, expect, it } from 'vitest';

import {
  findGDScriptSyntaxNodes,
  parseGDScriptSyntaxTree,
  readFirstDescendantText,
  readGDScriptLineNumber,
} from '../../src/gdscript/syntaxTree';

describe('parseGDScriptSyntaxTree', () => {
  it('exposes GDScript parser nodes for plugin structured analysis', () => {
    const content = [
      'class_name Player',
      'const MainScene = preload("res://scenes/main.tscn")',
      'var data = ResourceLoader.load("res://resources/data.tres")',
    ].join('\n');
    const tree = parseGDScriptSyntaxTree(content);

    const classNames = findGDScriptSyntaxNodes(tree, 'ClassNameStatement');
    const preloads = findGDScriptSyntaxNodes(tree, 'PreloadExpressionNode');
    const calls = findGDScriptSyntaxNodes(tree, 'CallExpressionNode');

    expect(readFirstDescendantText(classNames[0], 'Identifier')).toBe('Player');
    expect(readFirstDescendantText(preloads[0], 'String')).toBe('"res://scenes/main.tscn"');
    expect(calls.map((node) => node.text)).toContain(
      'ResourceLoader.load("res://resources/data.tres")',
    );
    expect(readGDScriptLineNumber(content, preloads[0].from)).toBe(2);
  });
});

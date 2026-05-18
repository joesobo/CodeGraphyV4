import { describe, expect, it } from 'vitest';
import { isLeadingClassNameStatement } from '../../src/gdscript/classNameLine';

describe('isLeadingClassNameStatement', () => {
  it('accepts class_name at the start of a source line', () => {
    const content = [
      'extends Node2D',
      '  class_name Player',
    ].join('\n');

    expect(isLeadingClassNameStatement(content, content.indexOf('class_name Player'))).toBe(true);
  });

  it('rejects class_name when earlier code appears on the same line', () => {
    const content = [
      'var class_name AlsoIgnored',
      'class_name LaterDeclaration',
    ].join('\n');

    expect(isLeadingClassNameStatement(content, content.indexOf('class_name AlsoIgnored'))).toBe(false);
  });

  it('rejects other text at a leading line offset', () => {
    const content = '  not_class_name Player';

    expect(isLeadingClassNameStatement(content, content.indexOf('not_class_name Player'))).toBe(false);
  });
});

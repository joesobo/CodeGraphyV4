import { describe, expect, it } from 'vitest';
import { buildGraphViewMergedGroups } from '../../../../src/extension/graphView/groups/merged';

describe('graphView/mergedGroups', () => {
  it('keeps user groups ahead of built-in and plugin defaults', () => {
    const groups = buildGraphViewMergedGroups(
      [{ id: 'user:src', pattern: 'src/**', color: '#ff0000' }],
      [{ id: 'default:*.json', pattern: '*.json', color: '#F9C74F' }],
      [
        {
          id: 'plugin:codegraphy.typescript:*.ts',
          pattern: '*.ts',
          color: '#3178C6',
        },
        {
          id: 'plugin:codegraphy.python:*.py',
          pattern: '*.py',
          color: '#3776AB',
        },
      ],
    );

    expect(groups).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#ff0000' },
      { id: 'default:*.json', pattern: '*.json', color: '#F9C74F' },
      { id: 'plugin:codegraphy.typescript:*.ts', pattern: '*.ts', color: '#3178C6' },
      { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' },
    ]);
  });

  it('keeps plain ids untouched', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      [{ id: 'plain', pattern: 'plain', color: '#123456' }],
      [],
    );

    expect(groups).toEqual([{ id: 'plain', pattern: 'plain', color: '#123456' }]);
  });

  it('does not infer a disabled empty section key from leading-colon ids', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      [],
      [{ id: ':leading', pattern: ':leading', color: '#654321' }],
    );

    expect(groups).toEqual([{ id: ':leading', pattern: ':leading', color: '#654321' }]);
  });

  it('includes built-in and plugin defaults when no user groups exist', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      [{ id: 'default:*.json', pattern: '*.json', color: '#F9C74F' }],
      [{ id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' }],
    );

    expect(groups).toEqual([
      { id: 'default:*.json', pattern: '*.json', color: '#F9C74F' },
      { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' },
    ]);
  });
});

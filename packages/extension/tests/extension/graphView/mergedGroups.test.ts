import { describe, expect, it } from 'vitest';
import { buildGraphViewMergedGroups } from '../../../src/extension/graphView/mergedGroups';

describe('graphView/mergedGroups', () => {
  it('marks hidden groups and hidden sections as disabled while preserving user groups', () => {
    const groups = buildGraphViewMergedGroups(
      [{ id: 'user:src', pattern: 'src/**', color: '#ff0000' }],
      new Set(['plugin:codegraphy.typescript', 'default']),
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
      { id: 'default:*.json', pattern: '*.json', color: '#F9C74F', disabled: true },
      { id: 'plugin:codegraphy.typescript:*.ts', pattern: '*.ts', color: '#3178C6', disabled: true },
      { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' },
    ]);
  });

  it('does not infer a disabled section key from groups without a colon', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      new Set(['plai']),
      [{ id: 'plain', pattern: 'plain', color: '#123456' }],
      [],
    );

    expect(groups).toEqual([{ id: 'plain', pattern: 'plain', color: '#123456' }]);
  });

  it('does not infer a disabled empty section key from leading-colon ids', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      new Set(['']),
      [],
      [{ id: ':leading', pattern: ':leading', color: '#654321' }],
    );

    expect(groups).toEqual([{ id: ':leading', pattern: ':leading', color: '#654321' }]);
  });

  it('leaves built-in and plugin defaults enabled when no hidden ids match', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      new Set(['plugin:codegraphy.typescript:*.tsx']),
      [{ id: 'default:*.json', pattern: '*.json', color: '#F9C74F' }],
      [{ id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' }],
    );

    expect(groups).toEqual([
      { id: 'default:*.json', pattern: '*.json', color: '#F9C74F' },
      { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' },
    ]);
  });
});

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

  it('applies persisted visibility overrides to built-in and plugin defaults', () => {
    const groups = buildGraphViewMergedGroups(
      [],
      [{ id: 'default:*.json', pattern: '*.json', color: '#F9C74F' }],
      [{ id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB' }],
      {
        'default:*.json': false,
        'plugin:codegraphy.python:*.py': true,
      },
    );

    expect(groups).toEqual([
      { id: 'default:*.json', pattern: '*.json', color: '#F9C74F', disabled: true },
      { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#3776AB', disabled: false },
    ]);
  });

  it('keeps unordered groups stable while moving ordered groups ahead of them', () => {
    const groups = buildGraphViewMergedGroups(
      [{ id: 'user:keep-first', pattern: 'src/**', color: '#111111' }],
      [
        { id: 'ordered', pattern: '*.ts', color: '#222222' },
        { id: 'default:keep-stable', pattern: '*.json', color: '#333333' },
      ],
      [{ id: 'plugin:keep-stable', pattern: '*.py', color: '#444444' }],
      {},
      ['ordered'],
    );

    expect(groups.map((group) => group.id)).toEqual([
      'ordered',
      'user:keep-first',
      'default:keep-stable',
      'plugin:keep-stable',
    ]);
  });

  it('preserves relative order when legend order does not mention either group', () => {
    const groups = buildGraphViewMergedGroups(
      [{ id: 'user:a', pattern: 'a/**', color: '#111111' }],
      [{ id: 'user:b', pattern: 'b/**', color: '#222222' }],
      [],
      {},
      ['ordered-only'],
    );

    expect(groups.map((group) => group.id)).toEqual(['user:a', 'user:b']);
  });
});

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
});

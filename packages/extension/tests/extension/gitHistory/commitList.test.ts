import { describe, expect, it, vi } from 'vitest';
import { getCommitList, parseCommitList } from '../../../src/extension/gitHistory/commitList';

describe('gitHistory/commitList', () => {
  it('parses commit output oldest-first', () => {
    const commits = parseCommitList([
      'abc123|1700000003|third commit|Alice|def456',
      'def456|1700000002|second commit|Bob|ghi789',
      'ghi789|1700000001|first commit|Alice|',
    ].join('\n'));

    expect(commits).toEqual([
      { sha: 'ghi789', timestamp: 1700000001, message: 'first commit', author: 'Alice', parents: [] },
      { sha: 'def456', timestamp: 1700000002, message: 'second commit', author: 'Bob', parents: ['ghi789'] },
      { sha: 'abc123', timestamp: 1700000003, message: 'third commit', author: 'Alice', parents: ['def456'] },
    ]);
  });

  it('skips malformed lines and preserves current pipe-splitting behavior', () => {
    const commits = parseCommitList([
      'bad-line',
      'sha1|1700000001|fix: handle a|b case|Dev|parent1',
    ].join('\n'));

    expect(commits).toEqual([
      {
        sha: 'sha1',
        timestamp: 1700000001,
        message: 'fix: handle a',
        author: 'b case',
        parents: ['Dev'],
      },
    ]);
  });

  it('requests the default branch and then the formatted log', async () => {
    const execGitMock = vi.fn(async (args: string[]) => {
      if (args[0] === 'rev-parse') {
        return 'feature-branch\n';
      }

      return 'sha1|1|first|Dev|\n';
    });

    const commits = await getCommitList(
      { execGit: execGitMock },
      10,
      new AbortController().signal
    );

    expect(execGitMock.mock.calls).toEqual([
      [['rev-parse', '--abbrev-ref', 'HEAD'], expect.any(AbortSignal)],
      [[
        'log',
        '--first-parent',
        'feature-branch',
        '--format=%H|%at|%s|%an|%P',
        '-n',
        '10',
      ], expect.any(AbortSignal)],
    ]);
    expect(commits).toEqual([
      { sha: 'sha1', timestamp: 1, message: 'first', author: 'Dev', parents: [] },
    ]);
  });

  it('parses commits with no parent field and ignores blank lines', () => {
    const commits = parseCommitList('\nsha1|1|first|Dev\n\n');

    expect(commits).toEqual([
      { sha: 'sha1', timestamp: 1, message: 'first', author: 'Dev', parents: [] },
    ]);
  });

  it('trims outer whitespace from the git output before parsing commits', () => {
    const commits = parseCommitList('  sha1|1|first|Dev|  ');

    expect(commits).toEqual([
      { sha: 'sha1', timestamp: 1, message: 'first', author: 'Dev', parents: [] },
    ]);
  });

  it('filters empty parent entries when the parent field contains repeated spacing', () => {
    const commits = parseCommitList('sha1|1|merge|Dev| parent1  parent2   parent3 ');

    expect(commits).toEqual([
      {
        sha: 'sha1',
        timestamp: 1,
        message: 'merge',
        author: 'Dev',
        parents: ['parent1', 'parent2', 'parent3'],
      },
    ]);
  });
});

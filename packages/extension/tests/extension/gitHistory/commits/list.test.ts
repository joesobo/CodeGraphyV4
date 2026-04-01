import { describe, expect, it } from 'vitest';
import { getCommitList, parseCommitList } from '../../../../src/extension/gitHistory/commits/list';

describe('gitHistory/commits/list', () => {
  it('parses commit list output into oldest-first order', () => {
    expect(
      parseCommitList(
        [
          'sha-2|200|message-2|author-2|parent-2',
          'sha-1|100|message-1|author-1|',
        ].join('\n'),
      ),
    ).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['parent-2'],
      },
    ]);
  });

  it('skips malformed rows but keeps four-field rows without parents', () => {
    expect(
      parseCommitList(
        [
          '',
          'invalid-row',
          'sha-2|200|message-2|author-2',
          'sha-1|100|message-1|author-1|',
          '',
        ].join('\n'),
      ),
    ).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: [],
      },
    ]);
  });

  it('trims surrounding whitespace from the command output', () => {
    expect(
      parseCommitList('  \nsha-1|100|message-1|author-1|\nsha-2|200|message-2|author-2|parent-1\n  '),
    ).toEqual([
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['parent-1'],
      },
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
    ]);
  });

  it('filters empty parent entries when multiple spaces separate parent shas', () => {
    expect(parseCommitList('sha-1|100|message-1|author-1|parent-1  parent-2   parent-3')).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: ['parent-1', 'parent-2', 'parent-3'],
      },
    ]);
  });

  it('requests the current default branch before fetching history', async () => {
    const calls: Array<{ args: string[]; signal: AbortSignal }> = [];
    const signal = new AbortController().signal;
    const execGit = async (args: string[]) => {
      calls.push({ args, signal });
      if (args[0] === 'rev-parse') {
        return 'main\n';
      }

      expect(args).toEqual([
        'log',
        '--first-parent',
        'main',
        '--format=%H|%at|%s|%an|%P',
        '-n',
        '2',
      ]);
      return 'sha-2|200|message-2|author-2|sha-1\nsha-1|100|message-1|author-1|';
    };

    await expect(getCommitList({ execGit }, 2, signal)).resolves.toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['sha-1'],
      },
    ]);

    expect(calls[0]).toEqual({
      args: ['rev-parse', '--abbrev-ref', 'HEAD'],
      signal,
    });
  });
});

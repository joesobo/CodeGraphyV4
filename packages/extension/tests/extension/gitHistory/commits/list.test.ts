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

  it('requests the current default branch before fetching history', async () => {
    const execGit = async (args: string[]) => {
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

    await expect(getCommitList({ execGit }, 2, new AbortController().signal)).resolves.toEqual([
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
  });
});
